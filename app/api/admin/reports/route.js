import { db } from '../../../lib/db';
import { reports, users } from '../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'pending' | 'resolved' | null = all

  try {
    const base = db
      .select({
        id: reports.id, user_id: reports.user_id, type: reports.type,
        description: reports.description, status: reports.status,
        resolved_at: reports.resolved_at, created_at: reports.created_at,
        user_name: users.name, user_email: users.email,
      })
      .from(reports)
      .leftJoin(users, eq(reports.user_id, users.id))
      .orderBy(desc(reports.created_at));

    const rows = status ? await base.where(eq(reports.status, status)) : await base;

    // Reproduit la forme imbriquée du join Supabase (`*, users(name, email)`)
    const data = rows.map(({ user_name, user_email, ...r }) => ({
      ...r,
      users: r.user_id ? { name: user_name, email: user_email } : null,
    }));

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, status } = await request.json();
  if (!id || !['pending', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  try {
    const [data] = await db
      .update(reports)
      .set({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .where(eq(reports.id, id))
      .returning();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  try {
    await db.delete(reports).where(eq(reports.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
