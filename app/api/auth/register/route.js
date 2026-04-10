import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { signPendingRegToken, PENDING_REG_COOKIE } from '../../../lib/auth';

export async function POST(request) {
  try {
    const { name, email, phone, password, address, postal_code, city, country, address_from_topo } =
      await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Numéro de téléphone requis pour la vérification.' }, { status: 400 });
    }

    // Import dynamique pour éviter les problèmes de bundling webpack
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

    // Hasher le mot de passe avec Argon2
    const password_hash = await argon2.hash(password);

    // Stocker toutes les données dans un cookie JWT signé (valide 10 min)
    // Le compte ne sera créé en DB qu'après vérification du SMS
    const pendingToken = await signPendingRegToken({
      id: randomUUID(),
      name,
      email: email.toLowerCase(),
      phone: phone.trim(),
      address: address ?? null,
      postal_code: postal_code ?? null,
      city: city ?? null,
      country: country ?? 'CH',
      password_hash,
      address_verified: address_from_topo ? 1 : 0,
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(PENDING_REG_COOKIE, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur.' }, { status: 500 });
  }
}
