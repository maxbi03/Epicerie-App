import { NextResponse } from 'next/server';
import { getSession, verifyToken, signToken, signOtpToken, OTP_COOKIE, AUTH_COOKIE, PENDING_REG_COOKIE } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabaseServer';
import { cookies } from 'next/headers';

const MAX_ATTEMPTS = 5; // tentatives max avant invalidation du code

export async function POST(request) {
  try {
    const { code } = await request.json();

    // Validation format : le code doit être exactement 6 chiffres
    if (!code || !/^\d{6}$/.test(String(code).trim())) {
      return NextResponse.json({ error: 'Code invalide (6 chiffres attendus).' }, { status: 400 });
    }

    const cookieStore = await cookies();

    const otpToken = cookieStore.get(OTP_COOKIE)?.value;
    if (!otpToken) {
      return NextResponse.json(
        { error: 'Code expiré ou introuvable. Renvoyez un nouveau code.' },
        { status: 400 }
      );
    }

    const otpPayload = await verifyToken(otpToken);
    if (!otpPayload) {
      return NextResponse.json(
        { error: 'Code expiré. Renvoyez un nouveau code.' },
        { status: 400 }
      );
    }

    // Vérifier le nombre de tentatives
    const attempts = Number(otpPayload.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      // Invalider le cookie
      const response = NextResponse.json(
        { error: `Trop de tentatives. Renvoyez un nouveau code.` },
        { status: 429 }
      );
      response.cookies.set(OTP_COOKIE, '', { maxAge: 0, path: '/' });
      return response;
    }

    // Code incorrect → incrémenter le compteur dans un nouveau token
    if (String(otpPayload.code) !== String(code).trim()) {
      const remaining = MAX_ATTEMPTS - attempts - 1;

      // Réémettre le token avec attempts+1 (même durée résiduelle ~10min)
      const newOtpToken = await signOtpToken({ ...otpPayload, attempts: attempts + 1 });
      const response = NextResponse.json(
        { error: `Code incorrect. ${remaining} tentative(s) restante(s).` },
        { status: 400 }
      );
      response.cookies.set(OTP_COOKIE, newOtpToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/',
      });
      return response;
    }

    // ── Code correct ──────────────────────────────────────────────────────────

    // CAS 1 : nouvelle inscription (cookie pending_registration présent)
    const pendingToken = cookieStore.get(PENDING_REG_COOKIE)?.value;
    if (pendingToken) {
      const pending = await verifyToken(pendingToken);
      if (!pending) {
        return NextResponse.json(
          { error: "Session d'inscription expirée. Veuillez recommencer l'inscription." },
          { status: 400 }
        );
      }

      if (otpPayload.pendingId !== pending.id) {
        return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
      }

      // Vérifier une dernière fois que l'email n'a pas été pris entre-temps
      const { data: existing } = await getSupabaseAdmin()
        .from('users')
        .select('id')
        .eq('email', pending.email)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec cet email.' },
          { status: 409 }
        );
      }

      // Créer le compte
      const { data, error } = await getSupabaseAdmin()
        .from('users')
        .insert({
          id:               pending.id,
          name:             pending.name,
          email:            pending.email,
          phone:            pending.phone,
          address:          pending.address,
          postal_code:      pending.postal_code,
          city:             pending.city,
          country:          pending.country ?? 'CH',
          password_hash:    pending.password_hash,
          address_verified: pending.address_verified ?? 0,
          phone_verified:   true,
        })
        .select()
        .single();

      if (error) {
        console.error('[verify-phone/confirm] insert error:', error.code, error.message);
        return NextResponse.json({ error: 'Erreur lors de la création du compte.' }, { status: 500 });
      }

      const authToken = await signToken({ userId: data.id, email: data.email });

      const response = NextResponse.json({
        ok: true,
        user: { id: data.id, name: data.name, email: data.email },
      });
      response.cookies.set(AUTH_COOKIE, authToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      response.cookies.set(OTP_COOKIE, '', { maxAge: 0, path: '/' });
      response.cookies.set(PENDING_REG_COOKIE, '', { maxAge: 0, path: '/' });

      return response;
    }

    // CAS 2 : utilisateur existant
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (otpPayload.userId !== session.userId) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    }

    const updatePayload = otpPayload.newPhone
      ? { phone: otpPayload.newPhone, phone_verified: true }
      : { phone_verified: true };

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update(updatePayload)
      .eq('id', session.userId);

    if (error) {
      console.error('[verify-phone/confirm] update error:', error.code, error.message);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour.' }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(OTP_COOKIE, '', { maxAge: 0, path: '/' });
    return response;

  } catch (err) {
    console.error('[verify-phone/confirm]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
