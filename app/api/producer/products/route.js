import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { PRODUCTS_TABLE } from '../../../lib/config';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data: producer } = await getSupabaseAdmin()
    .from('producers')
    .select('name')
    .eq('id', session.producerId)
    .single();

  if (!producer) return NextResponse.json({ error: 'Producteur introuvable' }, { status: 404 });

  const { data, error } = await getSupabaseAdmin()
    .from(PRODUCTS_TABLE)
    .select('id, name, category, price_chf, quantity, stock_shelf, stock_back, is_active, image_url')
    .eq('producer', producer.name)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
