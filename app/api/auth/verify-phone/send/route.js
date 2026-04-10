import { NextResponse } from 'next/server';
import { getSession, signOtpToken, verifyToken, OTP_COOKIE, PENDING_REG_COOKIE } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabaseServer';
import { cookies } from 'next/headers';

// Normalise le numéro suisse en format E.164 (+41XXXXXXXXX)
function normalizePhone(phone) {
  let p = phone.replace(/[\s\-\.\(\)]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  else if (p.startsWith('0') && !p.startsWith('0+')) p = '+41' + p.slice(1);
  return p;
}

async function sendSms(phone, code) {
  const params = new URLSearchParams({
    Userkey:     process.env.ASPSMS_USERKEY,
    Password:    process.env.ASPSMS_PASSWORD,
    MSISDN:      phone,
    Operation:   'SendTextSMS',
    MessageData: `Votre code L'Epicerie : ${code}`,
    Originator:  process.env.ASPSMS_ORIGINATOR || 'Epicerie',
  });
  const res = await fetch(`https://webapi.aspsms.com/SendSimpleSMS?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (data.ErrorCode !== 1) {
    throw new Error(`Envoi SMS échoué (${data.ErrorDescription ?? 'erreur inconnue'})`);
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const body = await request.json().catch(() => ({}));

    // ── CAS 1 : nouvelle inscription (cookie pending_registration) ─────────
    const pendingToken = cookieStore.get(PENDING_REG_COOKIE)?.value;
    if (pendingToken) {
      const pending = await verifyToken(pendingToken);
      if (!pending) {
        return NextResponse.json(
          { error: "Session d'inscription expirée. Recommencez l'inscription." },
          { status: 400 }
        );
      }
      if (!pending.phone) {
        return NextResponse.json({ error: 'Aucun numéro dans la session.' }, { status: 400 });
      }

      const phone = normalizePhone(pending.phone);
      const code  = String(Math.floor(100000 + Math.random() * 900000));

      await sendSms(phone, code);

      const otpToken = await signOtpToken({ pendingId: pending.id, phone, code });
      const response = NextResponse.json({ ok: true });
      response.cookies.set(OTP_COOKIE, otpToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/',
      });
      return response;
    }

    // ── CAS 2 : utilisateur connecté ──────────────────────────────────────
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Sous-cas 2a : changement de numéro (newPhone fourni dans le body)
    if (body.newPhone) {
      const phone = normalizePhone(body.newPhone);

      // Vérifier si ce numéro est déjà utilisé (par ce compte ou un autre)
      const { data: existing } = await getSupabaseAdmin()
        .from('users')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (existing && existing.id === session.userId) {
        return NextResponse.json(
          { error: 'Ce numéro est déjà votre numéro actuel.' },
          { status: 409 }
        );
      }
      if (existing) {
        return NextResponse.json(
          { error: 'Ce numéro est déjà utilisé par un autre compte.' },
          { status: 409 }
        );
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      await sendSms(phone, code);

      // On stocke newPhone dans le payload OTP pour l'appliquer lors de la confirmation
      const otpToken = await signOtpToken({ userId: session.userId, phone, newPhone: phone, code });
      const response = NextResponse.json({ ok: true });
      response.cookies.set(OTP_COOKIE, otpToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 10,
        path: '/',
      });
      return response;
    }

    // Sous-cas 2b : vérification du numéro existant (depuis le profil)
    const { data: user, error } = await getSupabaseAdmin()
      .from('users')
      .select('phone, phone_verified')
      .eq('id', session.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    if (!user.phone) {
      return NextResponse.json({ error: 'Aucun numéro de téléphone enregistré' }, { status: 400 });
    }
    if (user.phone_verified) {
      return NextResponse.json({ error: 'Téléphone déjà vérifié' }, { status: 400 });
    }

    const phone = normalizePhone(user.phone);
    const code  = String(Math.floor(100000 + Math.random() * 900000));

    await sendSms(phone, code);

    const otpToken = await signOtpToken({ userId: session.userId, phone, code });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(OTP_COOKIE, otpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });
    return response;

  } catch (err) {
    console.error('[verify-phone/send]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
