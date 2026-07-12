import { NextResponse } from 'next/server';
import { db } from '../../lib/db';
import { product_list } from '../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { PRODUCTS_ID } from '../../lib/config';

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
    discount_percent: row.discount_percent ?? null,
    discount_until: row.discount_until ?? null,
    expiry_date: row.expiry_date ?? null,
  };
}

export async function GET() {
  try {
    const data = await db
      .select()
      .from(product_list)
      .where(eq(product_list.is_active, true))
      .orderBy(asc(product_list.name));

    const products = data.map(normalizeProduct).filter(p => p.id != null);
    return NextResponse.json(products);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
