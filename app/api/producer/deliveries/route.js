import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { PRODUCTS_TABLE, PRODUCTS_ID } from '../../../lib/config';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from('producer_deliveries')
    .select('*')
    .eq('producer_id', session.producerId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
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

  const sb = getSupabaseAdmin();

  const { data: delivery, error: deliveryError } = await sb
    .from('producer_deliveries')
    .insert({ producer_id: session.producerId, items: validItems, notes: notes || null, status: 'pending' })
    .select()
    .single();

  if (deliveryError) return NextResponse.json({ error: deliveryError.message }, { status: 500 });

  // Incrémenter le stock_back pour chaque produit
  const ids = validItems.map(i => i.product_id);
  const { data: current } = await sb
    .from(PRODUCTS_TABLE)
    .select(`${PRODUCTS_ID}, stock_back`)
    .in(PRODUCTS_ID, ids);

  const currentMap = Object.fromEntries((current || []).map(p => [p[PRODUCTS_ID], Number(p.stock_back ?? 0)]));

  await Promise.allSettled(
    validItems.map(({ product_id, quantity }) =>
      sb.from(PRODUCTS_TABLE)
        .update({ stock_back: (currentMap[product_id] ?? 0) + Number(quantity) })
        .eq(PRODUCTS_ID, product_id)
    )
  );

  return NextResponse.json(delivery, { status: 201 });
}
