import { db } from '../../../../lib/db';
import { product_list } from '../../../../lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireAdmin } from '../../../../lib/adminUtils';
import { NextResponse } from 'next/server';

/**
 * POST /api/admin/products/stock
 * Opération incrémentale sur le stock — évite les race conditions.
 *
 * Body: { type: 'delivery', items: [{ id, qty }] }
 *   → Livraison fournisseur : stock_back += qty pour chaque produit
 */
export async function POST(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const body = await request.json();
  const { type, items } = body;

  if (type !== 'delivery') {
    return NextResponse.json({ error: 'Type inconnu' }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Aucun article fourni' }, { status: 400 });
  }

  // Validate items
  const validItems = items.filter(i => i.id && Number.isInteger(Number(i.qty)) && Number(i.qty) > 0);
  if (validItems.length === 0) {
    return NextResponse.json({ error: 'Aucune quantité valide saisie' }, { status: 400 });
  }

  // Fetch current stock_back values for all impacted products
  const ids = validItems.map(i => i.id);
  let current;
  try {
    current = await db
      .select({ id: product_list.id, stock_back: product_list.stock_back })
      .from(product_list)
      .where(inArray(product_list.id, ids));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const currentMap = Object.fromEntries(current.map(p => [p.id, Number(p.stock_back ?? 0)]));

  // Apply increments
  const updates = validItems.map(({ id, qty }) => ({
    id,
    stock_back: (currentMap[id] ?? 0) + Number(qty),
  }));

  const results = await Promise.allSettled(
    updates.map(({ id, stock_back }) =>
      db.update(product_list).set({ stock_back }).where(eq(product_list.id, id)).returning({ id: product_list.id, stock_back: product_list.stock_back })
    )
  );

  const errors = results.filter(r => r.status === 'rejected');
  if (errors.length > 0) {
    return NextResponse.json({ error: `${errors.length} mise(s) à jour échouée(s)` }, { status: 500 });
  }

  const updated = results.map(r => r.value[0]).filter(Boolean);
  return NextResponse.json({ success: true, updated, count: updated.length });
}
