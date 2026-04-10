import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { signPendingRegToken, PENDING_REG_COOKIE } from '../../../lib/auth';
import { validatePassword } from '../../../lib/password';
import { normalizePhone, validatePhone } from '../../../lib/phone';

/** Validation email côté serveur */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email requis.';
  if (email.length > 254) return 'Email trop long.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Format d\'email invalide.';
  return null;
}

export async function POST(request) {
  try {
    const { name, email, phone, password, address, postal_code, city, country, address_from_topo } =
      await request.json();

    // Validation des champs obligatoires
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nom requis (2 caractères minimum).' }, { status: 400 });
    }

    const emailError = validateEmail(email);
    if (emailError) return NextResponse.json({ error: emailError }, { status: 400 });

    const passwordError = validatePassword(password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone requis pour la vérification.' }, { status: 400 });
    }
    const phoneError = validatePhone(phone);
    if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });

    // Import dynamique argon2
    const argon2 = (await import('argon2')).default ?? (await import('argon2'));

    // Vérifier si l'email existe déjà
    const { data: existing } = await getSupabaseAdmin()
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 });
    }

    const password_hash = await argon2.hash(password);

    const pendingToken = await signPendingRegToken({
      id:               randomUUID(),
      name:             name.trim(),
      email:            email.toLowerCase(),
      phone:            normalizePhone(phone),
      address:          address ?? null,
      postal_code:      postal_code ?? null,
      city:             city ?? null,
      country:          country ?? 'CH',
      password_hash,
      address_verified: address_from_topo ? 1 : 0,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(PENDING_REG_COOKIE, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur.' }, { status: 500 });
  }
}
