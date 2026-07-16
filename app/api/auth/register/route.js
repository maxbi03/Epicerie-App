import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { signPendingRegToken, PENDING_REG_COOKIE } from '../../../lib/auth';
import { normalizePhone } from '../../../lib/phone';
import { UNLIMITED_ACCOUNTS_PHONE } from '../../../lib/config';
import { registerSchema } from '../../../lib/schemas';
import { parseBody } from '../../../lib/validation';

export async function POST(request) {
  try {
    const { data, error } = await parseBody(request, registerSchema);
    if (error) return error;
    const { name, email, phone, password, address, postal_code, city, country, address_from_topo } = data;

    // Import dynamique argon2
    const argon2 = (await import('argon2')).default ?? (await import('argon2'));

    // Vérifier si l'email existe déjà
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email.' }, { status: 409 });
    }

    // Vérifier l'unicité du téléphone avant d'envoyer un SMS (contrainte unique en DB),
    // sauf UNLIMITED_ACCOUNTS_PHONE qui peut être associé à plusieurs comptes.
    const normalizedPhone = normalizePhone(phone);
    if (normalizedPhone !== UNLIMITED_ACCOUNTS_PHONE) {
      const [existingPhone] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.phone, normalizedPhone))
        .limit(1);

      if (existingPhone) {
        return NextResponse.json({ error: 'Ce numéro de téléphone est déjà utilisé.' }, { status: 409 });
      }
    }

    const password_hash = await argon2.hash(password);

    const pendingToken = await signPendingRegToken({
      id:               randomUUID(),
      name:             name.trim(),
      email:            email.toLowerCase(),
      phone:            normalizedPhone,
      address:          address ?? null,
      postal_code:      postal_code ?? null,
      city:             city ?? null,
      country,
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
