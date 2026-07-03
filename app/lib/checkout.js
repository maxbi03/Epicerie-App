import { getSupabaseAdmin } from './supabaseServer';
import { updateStockAfterPayment } from './updateStock';
import { PRODUCTS_TABLE, PRODUCTS_ID, SALES_TABLE } from './config';

/** Prix unitaire effectif en centimes, remise appliquée si discount_percent > 0. */
export function effectivePriceCents(row) {
  const base = Number(row.price_chf ?? row.price ?? row.prix ?? 0);
  const disc = Number(row.discount_percent ?? 0);
  const unit = disc > 0 ? base * (1 - disc / 100) : base;
  return Math.round(unit * 100);
}

function shelfStock(row) {
  return Number(row.stock_shelf ?? 0);
}

function productName(row) {
  return row.name ?? row.title ?? row.nom ?? '';
}

/**
 * Recalcule le panier côté serveur à partir des seuls identifiants + quantités.
 * Ne fait JAMAIS confiance à un prix ou un total envoyé par le client.
 * @param {Array<{id:any, quantity:number}>} requested
 * @returns {Promise<{ items: Array, totalCents: number }>}
 * @throws {Error} si un produit est introuvable, inactif, ou en rupture
 */
export async function loadCartPricing(requested) {
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new Error('Panier vide');
  }

  // Normaliser et agréger les quantités par id (défense contre doublons)
  const qtyById = new Map();
  for (const line of requested) {
    const id = line?.id;
    const qty = Math.floor(Number(line?.quantity));
    if (id == null || !Number.isFinite(qty) || qty <= 0) {
      throw new Error('Article invalide dans le panier');
    }
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }

  const ids = [...qtyById.keys()];
  const { data: rows, error } = await getSupabaseAdmin()
    .from(PRODUCTS_TABLE)
    .select('*')
    .in(PRODUCTS_ID, ids);

  if (error) throw new Error(error.message);

  const byId = new Map((rows || []).map((r) => [r[PRODUCTS_ID] ?? r.id, r]));

  const items = [];
  let totalCents = 0;

  for (const [id, qty] of qtyById) {
    const row = byId.get(id);
    if (!row) throw new Error(`Produit introuvable (${id})`);
    if (row.is_active === false) throw new Error(`Produit indisponible : ${productName(row)}`);
    if (shelfStock(row) < qty) {
      throw new Error(`Stock insuffisant pour ${productName(row)}`);
    }

    const unitCents = effectivePriceCents(row);
    totalCents += unitCents * qty;
    items.push({ id, name: productName(row), qty, price: unitCents / 100 });
  }

  if (totalCents <= 0) throw new Error('Montant du panier invalide');

  return { items, totalCents };
}

/**
 * Enregistre une vente et applique ses effets (stock, total_spent) de façon
 * IDEMPOTENTE, clé sur `order_ref` (contrainte UNIQUE en DB). Rejouer le même
 * `order_ref` (retry webhook, double appel verify, course webhook↔verify) ne
 * décrémente le stock et n'incrémente total_spent qu'une seule fois.
 * @returns {Promise<{ alreadyProcessed: boolean }>}
 */
export async function finalizePaidOrder({ orderRef, items, clientName, userId, priceCents }) {
  if (!orderRef) throw new Error('order_ref manquant');
  const sb = getSupabaseAdmin();

  const receipt = items.map((i) => `${i.name} x${i.qty}`).join(', ');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // ON CONFLICT DO NOTHING : ne renvoie une ligne que si l'insert a réellement eu lieu.
  const { data: inserted, error: insertError } = await sb
    .from(SALES_TABLE)
    .upsert(
      {
        order_ref: orderRef,
        created_at: new Date().toISOString(),
        client_name: clientName || null,
        user_id: userId || null,
        receipt,
        price: priceCents,
        items_json: items,
        expires_at: expiresAt,
      },
      { onConflict: 'order_ref', ignoreDuplicates: true }
    )
    .select('order_ref');

  if (insertError) throw new Error(insertError.message);

  if (!inserted || inserted.length === 0) {
    return { alreadyProcessed: true };
  }

  await updateStockAfterPayment(items);

  if (userId) {
    const { error: rpcError } = await sb.rpc('increment_total_spent', {
      p_user_id: userId,
      p_amount: priceCents,
    });
    if (rpcError) console.error('increment_total_spent failed:', rpcError.message);
  }

  return { alreadyProcessed: false };
}
