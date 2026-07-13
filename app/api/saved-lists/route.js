import { getSession } from '../../lib/auth';
import { NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { saved_lists } from '../../lib/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';

async function auth() {
  const session = await getSession();
  if (!session) return { userId: null, error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  return { userId: session.userId, error: null };
}

export async function GET() {
  const { userId, error } = await auth();
  if (error) return error;

  try {
    const data = await db
      .select()
      .from(saved_lists)
      .where(eq(saved_lists.user_id, userId))
      .orderBy(desc(saved_lists.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId, error } = await auth();
  if (error) return error;

  const { name, items } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'Liste vide' }, { status: 400 });

  // Enforce 5-list maximum
  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(saved_lists)
    .where(eq(saved_lists.user_id, userId));
  if (count >= 5) return NextResponse.json({ error: 'Maximum 5 listes atteint. Supprimez-en une pour continuer.' }, { status: 409 });

  try {
    const [data] = await db
      .insert(saved_lists)
      .values({ user_id: userId, name: name.trim(), items })
      .returning();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { userId, error } = await auth();
  if (error) return error;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  try {
    await db.delete(saved_lists).where(and(eq(saved_lists.id, id), eq(saved_lists.user_id, userId)));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
