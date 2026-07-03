import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { signToken, AUTH_COOKIE } from '../../../lib/auth';

const MAX_FAILED = 5;         // échecs avant verrouillage
const WINDOW_SECS = 15 * 60;  // fenêtre glissante
const LOCKOUT_SECS = 15 * 60; // durée du verrou

// Hash factice calculé une fois : on vérifie toujours un hash argon2 (réel ou
// factice) pour que le temps de réponse ne révèle pas si l'email existe.
let dummyHash = null;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis.' }, { status: 400 });
    }

    const identifier = email.toLowerCase();
    const sb = getSupabaseAdmin();

    // Verrou anti brute-force : si l'identifiant est verrouillé, on refuse tôt.
    const { data: attempt } = await sb
      .from('login_attempts')
      .select('locked_until')
      .eq('identifier', identifier)
      .maybeSingle();

    if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429 }
      );
    }

    // Import dynamique pour éviter les problèmes de bundling webpack
    const argon2 = (await import('argon2')).default ?? (await import('argon2'));

    // Récupérer l'utilisateur par email
    const { data: user } = await sb
      .from('users')
      .select('id, name, email, password_hash')
      .eq('email', identifier)
      .maybeSingle();

    if (!dummyHash) dummyHash = await argon2.hash('timing-equalizer');
    const hashToCheck = user?.password_hash || dummyHash;
    const passwordMatches = await argon2.verify(hashToCheck, password).catch(() => false);
    const valid = Boolean(user?.password_hash) && passwordMatches;

    if (!valid) {
      // Message générique : ne révèle pas si l'email existe.
      await sb.rpc('record_login_failure', {
        p_identifier: identifier,
        p_max: MAX_FAILED,
        p_window_secs: WINDOW_SECS,
        p_lockout_secs: LOCKOUT_SECS,
      });
      return NextResponse.json({ error: 'Identifiants incorrects.' }, { status: 401 });
    }

    // Succès : on réinitialise le compteur d'échecs.
    await sb.rpc('clear_login_attempts', { p_identifier: identifier });

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
