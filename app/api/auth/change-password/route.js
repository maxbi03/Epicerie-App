import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { validatePassword } from '../../../lib/password';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const argon2 = (await import('argon2')).default ?? (await import('argon2'));

    // Récupérer le hash actuel
    const { data: user, error } = await getSupabaseAdmin()
      .from('users')
      .select('password_hash')
      .eq('id', session.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Vérifier le mot de passe actuel
    const valid = await argon2.verify(user.password_hash, currentPassword);
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
    }

    // Hasher et sauvegarder le nouveau
    const newHash = await argon2.hash(newPassword);
    const { error: updateError } = await getSupabaseAdmin()
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', session.userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[change-password]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
