import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';
import { PRODUCTS_TABLE, PRODUCTS_ID } from '../../../lib/config';

const REQUIRED_FIELDS = ['name', 'barcode', 'price_chf', 'quantity', 'category', 'image_url', 'producer'];

function isComplete(product) {
  return REQUIRED_FIELDS.every(f => {
    const val = product[f];
    if (val == null) return false;
    if (typeof val === 'string' && val.trim() === '') return false;
    if (f === 'price_chf' && Number(val) <= 0) return false;
    if (f === 'barcode' && !/^\d{13}$/.test(String(val).trim())) return false;
    return true;
  });
}

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from(PRODUCTS_TABLE)
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Recalculate is_active for all products and fix any mismatches
  const sb = getSupabaseAdmin();
  const toFix = [];
  const mapped = (data || []).map(p => {
    const correct = isComplete(p);
    if (p.is_active !== correct) {
      toFix.push({ id: p[PRODUCTS_ID] ?? p.id, is_active: correct });
    }
    return { ...p, id: p[PRODUCTS_ID] ?? p.id, is_active: correct };
  });

  // Batch fix mismatched products in background
  if (toFix.length > 0) {
    Promise.all(
      toFix.map(({ id, is_active }) =>
        sb.from(PRODUCTS_TABLE).update({ is_active }).eq(PRODUCTS_ID, id)
      )
    ).catch(err => console.error('Failed to fix is_active:', err));
  }

  return NextResponse.json(mapped);
}

export async function POST(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { name, barcode, price_chf, quantity, category, image_url, producer, description, badge, stock_shelf } = body;

  const cleanName = (name || '').trim();
  const cleanBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : null;

  // Check uniqueness
  const sb = getSupabaseAdmin();
  if (cleanName) {
    const { count } = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).ilike('name', cleanName);
    if (count > 0) return NextResponse.json({ error: 'Un produit avec ce nom existe déjà' }, { status: 409 });
  }
  if (cleanBarcode) {
    const { count } = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('barcode', cleanBarcode);
    if (count > 0) return NextResponse.json({ error: 'Un produit avec ce code-barres existe déjà' }, { status: 409 });
  }

  const product = {
    name: cleanName,
    barcode: cleanBarcode,
    price_chf: Number(price_chf || 0),
    category: category || 'Divers',
    image_url: image_url || '',
    producer: producer || '',
    description: description || '',
    badge: badge || '',
    quantity: quantity || '',
    stock_shelf: Math.max(0, Number(stock_shelf ?? 0)),
    is_active: isComplete(body),
  };

  const { data, error } = await sb
    .from(PRODUCTS_TABLE)
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
  const { id, _manual_toggle, ...rawFields } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID requis' }, { status: 400 });
  }

  const ALLOWED = ['name', 'barcode', 'price_chf', 'quantity', 'category', 'image_url', 'producer', 'description', 'badge', 'stock_shelf', 'stock_back', 'is_active'];
  const fields = {};
  for (const key of ALLOWED) {
    if (rawFields[key] !== undefined) fields[key] = rawFields[key];
  }
  if (fields.barcode !== undefined) fields.barcode = fields.barcode && String(fields.barcode).trim() !== '' ? String(fields.barcode).trim() : null;
  if (fields.name !== undefined) fields.name = (fields.name || '').trim();
  if (fields.price_chf != null) fields.price_chf = Number(fields.price_chf);
  if (fields.stock_shelf != null) fields.stock_shelf = Math.max(0, Number(fields.stock_shelf));
  if (fields.stock_back != null) fields.stock_back = Math.max(0, Number(fields.stock_back));

  // Check uniqueness
  const sb = getSupabaseAdmin();
  if (fields.name) {
    const { count } = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).ilike('name', fields.name).neq(PRODUCTS_ID, id);
    if (count > 0) return NextResponse.json({ error: 'Un produit avec ce nom existe déjà' }, { status: 409 });
  }
  if (fields.barcode) {
    const { count } = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('barcode', fields.barcode).neq(PRODUCTS_ID, id);
    if (count > 0) return NextResponse.json({ error: 'Un produit avec ce code-barres existe déjà' }, { status: 409 });
  }

  // Fetch current product to merge and recalculate is_active
  const { data: current } = await sb
    .from(PRODUCTS_TABLE)
    .select('*')
    .eq(PRODUCTS_ID, id)
    .single();

  if (current && !_manual_toggle) {
    const merged = { ...current, ...fields };
    fields.is_active = isComplete(merged);
  }

  const { data, error } = await sb
    .from(PRODUCTS_TABLE)
    .update(fields)
    .eq(PRODUCTS_ID, id)
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
    .from(PRODUCTS_TABLE)
    .delete()
    .eq(PRODUCTS_ID, id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
