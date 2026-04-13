import { getSupabaseAdmin } from '../../../../lib/supabaseServer';
import { requireAdmin } from '../../../../lib/adminUtils';
import { NextResponse } from 'next/server';
import { PRODUCTS_TABLE, PRODUCTS_ID } from '../../../../lib/config';

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

  const sb = getSupabaseAdmin();

  // Fetch current stock_back values for all impacted products
  const ids = validItems.map(i => i.id);
  const { data: current, error: fetchError } = await sb
    .from(PRODUCTS_TABLE)
    .select(`${PRODUCTS_ID}, stock_back`)
    .in(PRODUCTS_ID, ids);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const currentMap = Object.fromEntries((current || []).map(p => [p[PRODUCTS_ID] ?? p.id, Number(p.stock_back ?? 0)]));

  // Apply increments
  const updates = validItems.map(({ id, qty }) => ({
    [PRODUCTS_ID]: id,
    stock_back: (currentMap[id] ?? 0) + Number(qty),
  }));

  const results = await Promise.allSettled(
    updates.map(({ [PRODUCTS_ID]: id, stock_back }) =>
      sb
        .from(PRODUCTS_TABLE)
        .update({ stock_back })
        .eq(PRODUCTS_ID, id)
        .select(`${PRODUCTS_ID}, stock_back`)
        .single()
    )
  );

  const errors = results.filter(r => r.status === 'rejected' || r.value?.error);
  if (errors.length > 0) {
    return NextResponse.json({ error: `${errors.length} mise(s) à jour échouée(s)` }, { status: 500 });
  }

  const updated = results.map(r => r.value.data).filter(Boolean);
  return NextResponse.json({ success: true, updated, count: updated.length });
}
