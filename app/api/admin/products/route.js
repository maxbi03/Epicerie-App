import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

const REQUIRED_FIELDS = ['name', 'barcode', 'price_chf', 'quantity', 'category', 'image_url', 'producer', 'description'];

function isComplete(product) {
  return REQUIRED_FIELDS.every(f => {
    const val = product[f];
    if (val == null) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (f === 'price_chf' && Number(val) <= 0) return false;
    return true;
  });
}

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { name, barcode, price_chf, quantity, category, image_url, producer, description, badge, stock_shelf } = body;

  const product = {
    name: name || '',
    barcode: barcode || null,
    price_chf: Number(price_chf || 0),
    category: category || 'Divers',
    image_url: image_url || '',
    producer: producer || '',
    description: description || '',
    badge: badge || '',
    quantity: quantity || '',
    stock_shelf: Number(stock_shelf ?? 0),
    is_active: isComplete(body),
  };

  const { data, error } = await getSupabaseAdmin()
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...rawFields } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const ALLOWED = ['name', 'barcode', 'price_chf', 'quantity', 'category', 'image_url', 'producer', 'description', 'badge', 'stock_shelf', 'stock_back', 'is_active'];
  const fields = {};
  for (const key of ALLOWED) {
    if (rawFields[key] !== undefined) fields[key] = rawFields[key];
  }
  if (fields.price_chf != null) fields.price_chf = Number(fields.price_chf);
  if (fields.stock_shelf != null) fields.stock_shelf = Number(fields.stock_shelf);
  if (fields.stock_back != null) fields.stock_back = Number(fields.stock_back);

  // Fetch current product to merge and recalculate is_active
  const { data: current } = await getSupabaseAdmin()
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (current) {
    const merged = { ...current, ...fields };
    fields.is_active = isComplete(merged);
  }

  const { data, error } = await getSupabaseAdmin()
    .from('products')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
