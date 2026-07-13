import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { db } from '../../../lib/db';
import { producer_deliveries, product_list } from '../../../lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const data = await db
      .select()
      .from(producer_deliveries)
      .where(eq(producer_deliveries.producer_id, session.producerId))
      .orderBy(desc(producer_deliveries.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { items, notes } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Articles requis' }, { status: 400 });
  }

  const validItems = items.filter(i => i.product_id && Number(i.quantity) > 0);
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'Aucune quantité valide' }, { status: 400 });
  }

  let delivery;
  try {
    [delivery] = await db
      .insert(producer_deliveries)
      .values({ producer_id: session.producerId, items: validItems, notes: notes || null, status: 'pending' })
      .returning();
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Incrémenter le stock_back pour chaque produit
  const ids = validItems.map(i => i.product_id);
  const current = await db
    .select({ id: product_list.id, stock_back: product_list.stock_back })
    .from(product_list)
    .where(inArray(product_list.id, ids));

  const currentMap = Object.fromEntries(current.map(p => [p.id, Number(p.stock_back ?? 0)]));

  await Promise.allSettled(
    validItems.map(({ product_id, quantity }) =>
      db.update(product_list)
        .set({ stock_back: (currentMap[product_id] ?? 0) + Number(quantity) })
        .where(eq(product_list.id, product_id))
    )
  );

  return NextResponse.json(delivery, { status: 201 });
}
