import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
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
    const [user] = await db
      .select({ password_hash: users.password_hash })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    // Vérifier le mot de passe actuel
    const valid = await argon2.verify(user.password_hash, currentPassword);
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
    }

    // Hasher et sauvegarder le nouveau
    const newHash = await argon2.hash(newPassword);
    await db.update(users).set({ password_hash: newHash }).where(eq(users.id, session.userId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[change-password]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
