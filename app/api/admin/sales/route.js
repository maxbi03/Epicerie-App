import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { sales } from '../../../lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';

export async function GET() {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const data = await db.select().from(sales).orderBy(desc(sales.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
