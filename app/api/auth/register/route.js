import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { signToken, AUTH_COOKIE } from '../../../lib/auth';

export async function POST(request) {
  try {
    const { name, email, phone, password, address, postal_code, city, country, address_from_topo } =
      await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
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

    const { data, error } = await getSupabaseAdmin()
      .from('users')
      .insert({
        id: randomUUID(),
        name,
        email: email.toLowerCase(),
        phone: phone ?? null,
        address: address ?? null,
        postal_code: postal_code ?? null,
        city: city ?? null,
        country: country ?? 'CH',
        password_hash,
        address_verified: address_from_topo ? 1 : 0,
        phone_verified: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const token = await signToken({ userId: data.id, email: data.email });

    const response = NextResponse.json({ user: { id: data.id, name: data.name, email: data.email } });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[register]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur.' }, { status: 500 });
  }
}
