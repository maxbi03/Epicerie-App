import { getSession } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { sales } from '../../../lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await params;
  const [data] = await db
    .select({
      id: sales.id, created_at: sales.created_at, price: sales.price,
      receipt: sales.receipt, items_json: sales.items_json, client_name: sales.client_name,
    })
    .from(sales)
    .where(and(eq(sales.id, Number(id)), eq(sales.user_id, session.userId)))  // ses propres reçus uniquement
    .limit(1);

  if (!data) return NextResponse.json({ error: 'Reçu introuvable' }, { status: 404 });
  return NextResponse.json(data);
}
