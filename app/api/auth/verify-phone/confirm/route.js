import { NextResponse } from 'next/server';
import { getSession, verifyToken, signToken, OTP_COOKIE, AUTH_COOKIE, PENDING_REG_COOKIE } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabaseServer';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { code } = await request.json();
    if (!code) {
      return NextResponse.json({ error: 'Code requis' }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Lire et vérifier le cookie OTP
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

    if (String(otpPayload.code) !== String(code).trim()) {
      return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
    }

    // CAS 1 : nouvelle inscription (cookie pending_registration présent)
    const pendingToken = cookieStore.get(PENDING_REG_COOKIE)?.value;
    if (pendingToken) {
      const pending = await verifyToken(pendingToken);
      if (!pending) {
        return NextResponse.json(
          { error: 'Session d\'inscription expirée. Veuillez recommencer l\'inscription.' },
          { status: 400 }
        );
      }

      // Vérifier que l'OTP correspond bien à cette inscription
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

      // Créer le compte maintenant que le SMS est vérifié
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
          phone_verified:   true, // vérifié à l'instant
        })
        .select()
        .single();

      if (error) {
        console.error('[verify-phone/confirm] insert error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Créer la session auth + vider les cookies temporaires
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

    // CAS 2 : utilisateur existant qui vérifie son téléphone
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (otpPayload.userId !== session.userId) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    }

    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ phone_verified: true })
      .eq('id', session.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(OTP_COOKIE, '', { maxAge: 0, path: '/' });

    return response;
  } catch (err) {
    console.error('[verify-phone/confirm]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
