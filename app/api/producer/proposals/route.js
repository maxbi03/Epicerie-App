import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('producer_proposals')
    .select('*')
    .eq('producer_id', session.producerId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
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

  const { data, error } = await getSupabaseAdmin()
    .from('producer_proposals')
    .insert({
      producer_id: session.producerId,
      type,
      product_id: product_id || null,
      data: proposalData,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
