import { NextResponse } from 'next/server';
import { getSession, signOtpToken, verifyToken, OTP_COOKIE, PENDING_REG_COOKIE } from '../../../../lib/auth';
import { db } from '../../../../lib/db';
import { users } from '../../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { normalizePhone, validatePhone } from '../../../../lib/phone';
import { hashOtp } from '../../../../lib/otp';
import { UNLIMITED_ACCOUNTS_PHONE } from '../../../../lib/config';
import { verifyPhoneSendSchema } from '../../../../lib/schemas';
import { parseBody } from '../../../../lib/validation';
import { cookies } from 'next/headers';

/** Génère un code OTP à 6 chiffres cryptographiquement sûr */
function generateOtp() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(100000 + (array[0] % 900000));
}

/** Vérifie si un renvoi est autorisé (cooldown 60s côté serveur) */
async function checkResendCooldown(cookieStore) {
  const existing = cookieStore.get(OTP_COOKIE)?.value;
  if (!existing) return null; // Pas de cooldown si pas de cookie

  const payload = await verifyToken(existing);
  if (!payload || !payload.iat) return null;

  const elapsed = Math.floor(Date.now() / 1000) - payload.iat;
  const COOLDOWN = 60; // secondes
  if (elapsed < COOLDOWN) {
    return `Veuillez attendre ${COOLDOWN - elapsed} seconde(s) avant de renvoyer un code.`;
  }
  return null;
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
  const res  = await fetch(`https://webapi.aspsms.com/SendSimpleSMS?${params.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (data.ErrorCode !== 1) {
    throw new Error(`Envoi SMS échoué (${data.ErrorDescription ?? 'erreur inconnue'})`);
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const { data: body, error: validationError } = await parseBody(request, verifyPhoneSendSchema);
    if (validationError) return validationError;

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

      // Rate limiting : cooldown 60s entre deux envois
      const cooldownError = await checkResendCooldown(cookieStore);
      if (cooldownError) {
        return NextResponse.json({ error: cooldownError }, { status: 429 });
      }

      const phone = normalizePhone(pending.phone);
      const phoneError = validatePhone(phone);
      if (phoneError) {
        return NextResponse.json({ error: phoneError }, { status: 400 });
      }

      const code = generateOtp();
      await sendSms(phone, code);

      const otpToken = await signOtpToken({ pendingId: pending.id, phone, codeHash: hashOtp(code), attempts: 0 });
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
      const phoneError = validatePhone(phone);
      if (phoneError) {
        return NextResponse.json({ error: phoneError }, { status: 400 });
      }

      // Rate limiting
      const cooldownError = await checkResendCooldown(cookieStore);
      if (cooldownError) {
        return NextResponse.json({ error: cooldownError }, { status: 429 });
      }

      // Vérifier si ce numéro est déjà utilisé (sauf UNLIMITED_ACCOUNTS_PHONE, réutilisable)
      if (phone !== UNLIMITED_ACCOUNTS_PHONE) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.phone, phone))
          .limit(1);

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
      }

      const code = generateOtp();
      await sendSms(phone, code);

      const otpToken = await signOtpToken({ userId: session.userId, phone, newPhone: phone, codeHash: hashOtp(code), attempts: 0 });
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

    // Sous-cas 2b : vérification du numéro existant
    const cooldownError = await checkResendCooldown(cookieStore);
    if (cooldownError) {
      return NextResponse.json({ error: cooldownError }, { status: 429 });
    }

    const [user] = await db
      .select({ phone: users.phone, phone_verified: users.phone_verified })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    if (!user.phone) {
      return NextResponse.json({ error: 'Aucun numéro de téléphone enregistré' }, { status: 400 });
    }
    if (user.phone_verified) {
      return NextResponse.json({ error: 'Téléphone déjà vérifié' }, { status: 400 });
    }

    const phone = normalizePhone(user.phone);
    const phoneError = validatePhone(phone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const code = generateOtp();
    await sendSms(phone, code);

    const otpToken = await signOtpToken({ userId: session.userId, phone, codeHash: hashOtp(code), attempts: 0 });
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
