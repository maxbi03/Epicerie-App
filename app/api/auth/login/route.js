import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { signToken, AUTH_COOKIE } from '../../../lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
    }

    // Import dynamique pour éviter les problèmes de bundling webpack
    const argon2 = (await import('argon2')).default ?? (await import('argon2'));

    // Récupérer l'utilisateur par email
    const { data: user, error } = await getSupabaseAdmin()
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error || !user || !user.password_hash) {
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    // Vérifier le mot de passe avec Argon2
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    const token = await signToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur.' }, { status: 500 });
  }
}
