import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { saveAvatar, deleteAvatarByUrl, extFromContentType } from '../../../lib/storage';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    // Vérifications de sécurité
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format non supporté. Utilisez JPEG, PNG ou WebP.' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image trop grande (max 2 Mo)' }, { status: 400 });
    }

    // Supprimer l'ancienne photo si elle existe
    const [existing] = await db.select({ avatar_url: users.avatar_url }).from(users).where(eq(users.id, session.userId)).limit(1);
    if (existing?.avatar_url) {
      await deleteAvatarByUrl(existing.avatar_url);
    }

    // Enregistrer la nouvelle photo sur disque
    const ext = extFromContentType(file.type);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const avatarUrl = await saveAvatar(session.userId, ext, buffer);

    // Mettre à jour avatar_url dans la table users
    await db.update(users).set({ avatar_url: avatarUrl }).where(eq(users.id, session.userId));

    return NextResponse.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('[avatar]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const [user] = await db.select({ avatar_url: users.avatar_url }).from(users).where(eq(users.id, session.userId)).limit(1);

    if (user?.avatar_url) {
      await deleteAvatarByUrl(user.avatar_url);
    }

    await db.update(users).set({ avatar_url: null }).where(eq(users.id, session.userId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[avatar/delete]', err);
    return NextResponse.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
