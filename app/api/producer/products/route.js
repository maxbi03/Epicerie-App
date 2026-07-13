import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { db } from '../../../lib/db';
import { producers, product_list } from '../../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const [producer] = await db
    .select({ name: producers.name })
    .from(producers)
    .where(eq(producers.id, session.producerId))
    .limit(1);

  if (!producer) return NextResponse.json({ error: 'Producteur introuvable' }, { status: 404 });

  try {
    const data = await db
      .select({
        id: product_list.id, name: product_list.name, category: product_list.category,
        price_chf: product_list.price_chf, quantity: product_list.quantity,
        stock_shelf: product_list.stock_shelf, stock_back: product_list.stock_back,
        is_active: product_list.is_active, image_url: product_list.image_url,
      })
      .from(product_list)
      .where(eq(product_list.producer, producer.name))
      .orderBy(asc(product_list.name));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
