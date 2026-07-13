import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { db } from '../../../lib/db';
import { producer_proposals } from '../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const data = await db
      .select()
      .from(producer_proposals)
      .where(eq(producer_proposals.producer_id, session.producerId))
      .orderBy(desc(producer_proposals.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { type, product_id, data: proposalData } = await request.json();

  if (!type || !['new_product', 'price_change'].includes(type)) {
    return NextResponse.json({ error: 'Type invalide (new_product ou price_change)' }, { status: 400 });
  }
  if (!proposalData || Object.keys(proposalData).length === 0) {
    return NextResponse.json({ error: 'Données requises' }, { status: 400 });
  }

  try {
    const [data] = await db
      .insert(producer_proposals)
      .values({
        producer_id: session.producerId,
        type,
        product_id: product_id || null,
        data: proposalData,
        status: 'pending',
      })
      .returning();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
