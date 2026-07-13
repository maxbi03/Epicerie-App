import { db } from '../../../lib/db';
import { product_list } from '../../../lib/db/schema';
import { eq, ne, ilike, asc, sql, and } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

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

async function countMatching(where) {
  const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(product_list).where(where);
  return count;
}

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const data = await db.select().from(product_list).orderBy(asc(product_list.name));

    // Recalculate is_active for all products and fix any mismatches
    const toFix = [];
    const mapped = data.map(p => {
      const correct = isComplete(p);
      if (p.is_active !== correct) {
        toFix.push({ id: p.id, is_active: correct });
      }
      return { ...p, is_active: correct };
    });

    // Batch fix mismatched products in background
    if (toFix.length > 0) {
      Promise.all(
        toFix.map(({ id, is_active }) =>
          db.update(product_list).set({ is_active }).where(eq(product_list.id, id))
        )
      ).catch(err => console.error('Failed to fix is_active:', err));
    }

    return NextResponse.json(mapped);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { name, barcode, price_chf, quantity, category, image_url, producer, description, badge, stock_shelf, expiry_date, discount_percent, discount_until } = body;

  const cleanName = (name || '').trim();
  const cleanBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : null;

  // Check uniqueness
  if (cleanName) {
    const count = await countMatching(ilike(product_list.name, cleanName));
    if (count > 0) return NextResponse.json({ error: 'Un produit avec ce nom existe déjà' }, { status: 409 });
  }
  if (cleanBarcode) {
    const count = await countMatching(eq(product_list.barcode, cleanBarcode));
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
    expiry_date: expiry_date || null,
    discount_percent: discount_percent !== '' && discount_percent != null ? Math.min(100, Math.max(0, Number(discount_percent))) : null,
    discount_until: discount_until || null,
  };

  try {
    const [data] = await db.insert(product_list).values(product).returning();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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

  const ALLOWED = ['name', 'barcode', 'price_chf', 'quantity', 'category', 'image_url', 'producer', 'description', 'badge', 'stock_shelf', 'stock_back', 'is_active', 'expiry_date', 'discount_percent', 'discount_until'];
  const fields = {};
  for (const key of ALLOWED) {
    if (rawFields[key] !== undefined) fields[key] = rawFields[key];
  }
  if (fields.barcode !== undefined) fields.barcode = fields.barcode && String(fields.barcode).trim() !== '' ? String(fields.barcode).trim() : null;
  if (fields.name !== undefined) fields.name = (fields.name || '').trim();
  if (fields.price_chf != null) fields.price_chf = Number(fields.price_chf);
  if (fields.stock_shelf != null) fields.stock_shelf = Math.max(0, Number(fields.stock_shelf));
  if (fields.stock_back != null) fields.stock_back = Math.max(0, Number(fields.stock_back));
  if (fields.discount_percent != null) fields.discount_percent = fields.discount_percent === '' ? null : Math.min(100, Math.max(0, Number(fields.discount_percent)));
  if (fields.expiry_date === '') fields.expiry_date = null;
  if (fields.discount_until === '') fields.discount_until = null;

  // Check uniqueness
  if (fields.name) {
    const count = await countMatching(and(ilike(product_list.name, fields.name), ne(product_list.id, id)));
    if (count > 0) return NextResponse.json({ error: 'Un produit avec ce nom existe déjà' }, { status: 409 });
  }
  if (fields.barcode) {
    const count = await countMatching(and(eq(product_list.barcode, fields.barcode), ne(product_list.id, id)));
    if (count > 0) return NextResponse.json({ error: 'Un produit avec ce code-barres existe déjà' }, { status: 409 });
  }

  // Fetch current product to merge and recalculate is_active
  const [current] = await db.select().from(product_list).where(eq(product_list.id, id)).limit(1);

  if (current && !_manual_toggle) {
    const merged = { ...current, ...fields };
    fields.is_active = isComplete(merged);
  }

  try {
    const [data] = await db.update(product_list).set(fields).where(eq(product_list.id, id)).returning();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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

  try {
    await db.delete(product_list).where(eq(product_list.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
