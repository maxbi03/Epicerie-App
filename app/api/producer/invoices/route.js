import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('producer_invoices')
    .select('*')
    .eq('producer_id', session.producerId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
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

  const sb = getSupabaseAdmin();

  // Générer un numéro de facture séquentiel simple
  const year = new Date().getFullYear();
  const { count } = await sb
    .from('producer_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('producer_id', session.producerId);

  const invoice_number = `FAC-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const { data, error } = await sb
    .from('producer_invoices')
    .insert({
      producer_id: session.producerId,
      delivery_id: delivery_id || null,
      items,
      amount_chf,
      notes: notes || null,
      invoice_number,
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
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

  const { data, error } = await getSupabaseAdmin()
    .from('producer_invoices')
    .update(updates)
    .eq('id', id)
    .eq('producer_id', session.producerId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
