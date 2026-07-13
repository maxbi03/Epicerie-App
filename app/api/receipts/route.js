import { getSession } from '../../lib/auth';
import { NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { sales } from '../../lib/db/schema';
import { and, eq, gte, desc } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const data = await db
      .select({
        id: sales.id, created_at: sales.created_at, price: sales.price,
        receipt: sales.receipt, items_json: sales.items_json, client_name: sales.client_name,
      })
      .from(sales)
      .where(and(eq(sales.user_id, session.userId), gte(sales.created_at, since)))
      .orderBy(desc(sales.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
