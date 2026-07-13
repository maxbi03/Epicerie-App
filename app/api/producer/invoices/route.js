import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { db } from '../../../lib/db';
import { producer_invoices } from '../../../lib/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const data = await db
      .select()
      .from(producer_invoices)
      .where(eq(producer_invoices.producer_id, session.producerId))
      .orderBy(desc(producer_invoices.created_at));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { delivery_id, items, notes } = await request.json();
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Articles requis' }, { status: 400 });
  }

  const amount_chf = items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.price_unit)), 0);
  if (amount_chf <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
  }

  // Générer un numéro de facture séquentiel simple
  const year = new Date().getFullYear();
  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(producer_invoices)
    .where(eq(producer_invoices.producer_id, session.producerId));

  const invoice_number = `FAC-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;

  try {
    const [data] = await db
      .insert(producer_invoices)
      .values({
        producer_id: session.producerId,
        delivery_id: delivery_id || null,
        items,
        amount_chf,
        notes: notes || null,
        invoice_number,
        status: 'draft',
      })
      .returning();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id, status } = await request.json();
  if (!id || !status) return NextResponse.json({ error: 'id et status requis' }, { status: 400 });

  const allowed = ['draft', 'sent'];
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });

  const updates = { status };
  if (status === 'sent') updates.sent_at = new Date().toISOString();

  try {
    const [data] = await db
      .update(producer_invoices)
      .set(updates)
      .where(and(eq(producer_invoices.id, id), eq(producer_invoices.producer_id, session.producerId)))
      .returning();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
