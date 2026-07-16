import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/adminUtils';
import { db } from '../../../lib/db';
import { producer_invoices, producer_proposals, producers } from '../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { adminProducerRequestUpdateSchema } from '../../../lib/schemas';
import { parseBody } from '../../../lib/validation';

function withNestedProducer(rows) {
  return rows.map(({ producer_name, producer_email, ...r }) => ({
    ...r,
    producers: r.producer_id ? { name: producer_name, email: producer_email } : null,
  }));
}

export async function GET(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'proposals';

  try {
    if (view === 'invoices') {
      const rows = await db
        .select({
          id: producer_invoices.id, producer_id: producer_invoices.producer_id,
          delivery_id: producer_invoices.delivery_id, invoice_number: producer_invoices.invoice_number,
          items: producer_invoices.items, amount_chf: producer_invoices.amount_chf,
          status: producer_invoices.status, notes: producer_invoices.notes,
          sent_at: producer_invoices.sent_at, paid_at: producer_invoices.paid_at,
          created_at: producer_invoices.created_at,
          producer_name: producers.name, producer_email: producers.email,
        })
        .from(producer_invoices)
        .leftJoin(producers, eq(producer_invoices.producer_id, producers.id))
        .orderBy(desc(producer_invoices.created_at));

      return NextResponse.json(withNestedProducer(rows));
    }

    // proposals (default)
    const rows = await db
      .select({
        id: producer_proposals.id, producer_id: producer_proposals.producer_id,
        type: producer_proposals.type, product_id: producer_proposals.product_id,
        data: producer_proposals.data, status: producer_proposals.status,
        admin_note: producer_proposals.admin_note, created_at: producer_proposals.created_at,
        updated_at: producer_proposals.updated_at,
        producer_name: producers.name, producer_email: producers.email,
      })
      .from(producer_proposals)
      .leftJoin(producers, eq(producer_proposals.producer_id, producers.id))
      .orderBy(desc(producer_proposals.created_at));

    return NextResponse.json(withNestedProducer(rows));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { data: parsed, error: validationError } = await parseBody(request, adminProducerRequestUpdateSchema);
  if (validationError) return validationError;
  const { id, type, status, admin_note } = parsed;

  try {
    if (type === 'invoice') {
      const updates = { status };
      if (status === 'paid') updates.paid_at = new Date().toISOString();
      const [data] = await db.update(producer_invoices).set(updates).where(eq(producer_invoices.id, id)).returning();
      return NextResponse.json(data);
    }

    // proposal
    const [data] = await db
      .update(producer_proposals)
      .set({ status, admin_note: admin_note || null })
      .where(eq(producer_proposals.id, id))
      .returning();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
