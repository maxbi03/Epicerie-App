import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { NextResponse } from 'next/server';
import { PRODUCTS_TABLE, PRODUCTS_ID } from '../../lib/config';

function normalizeProduct(row) {
  const stock = row.stock_shelf ?? row.stock_total ?? row.stock ?? row.quantity ?? row.qty ?? 0;
  const barcode = row.barcode ?? row.ean ?? row.ean13 ?? row.code_barres ?? row.codebarres;
  return {
    id: row[PRODUCTS_ID] ?? row.id,
    name: row.name ?? row.title ?? row.nom ?? '',
    barcode: barcode == null ? null : String(barcode),
    price: Number(row.price_chf ?? row.price ?? row.prix ?? 0),
    unit: row.unit ?? row.unite ?? '',
    origin: row.producer ?? row.origin ?? row.fournisseur ?? row.origine ?? '',
    image: row.image_url ?? row.image ?? row.photo ?? '',
    category: row.category ?? row.categorie ?? 'Divers',
    badge: row.badge ?? row.label ?? '',
    stock: Number(stock ?? 0),
    quantity: row.quantity ?? '',
    description: row.description ?? '',
  };
}

export async function GET() {
  const { data, error } = await getSupabaseAdmin()
    .from(PRODUCTS_TABLE)
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const products = (data || []).map(normalizeProduct).filter(p => p.id != null);
  return NextResponse.json(products);
}
