import { NextResponse } from 'next/server';
import { getSession, signOtpToken, OTP_COOKIE } from '../../../../lib/auth';
import { getSupabaseAdmin } from '../../../../lib/supabaseServer';

// Normalise le numéro suisse en format E.164 (+41XXXXXXXXX)
function normalizePhone(phone) {
  let p = phone.replace(/[\s\-\.\(\)]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  else if (p.startsWith('0') && !p.startsWith('0+')) p = '+41' + p.slice(1);
  return p;
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Récupérer le téléphone depuis la DB
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

    // Générer un code à 6 chiffres
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Envoyer le SMS via ASPSMS HTTP API
    const params = new URLSearchParams({
      Userkey:   process.env.ASPSMS_USERKEY,
      Password:  process.env.ASPSMS_PASSWORD,
      MSISDN:    phone,
      Operation: 'SendTextSMS',
      MessageData: `Votre code L'Epicerie : ${code}`,
      Originator: process.env.ASPSMS_ORIGINATOR || 'Epicerie',
    });

    const smsRes = await fetch(
      `https://webapi.aspsms.com/SendSimpleSMS?${params.toString()}`
    );

    const smsData = await smsRes.json().catch(() => ({}));

    // ErrorCode 1 = succès chez ASPSMS HTTP API
    if (smsData.ErrorCode !== 1) {
      console.error('[verify-phone/send] ASPSMS error:', smsData);
      return NextResponse.json(
        { error: `Envoi SMS échoué (${smsData.ErrorDescription ?? 'erreur inconnue'})` },
        { status: 502 }
      );
    }

    // Signer le code dans un cookie JWT (10 min)
    const otpToken = await signOtpToken({ userId: session.userId, phone, code });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(OTP_COOKIE, otpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[verify-phone/send]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
