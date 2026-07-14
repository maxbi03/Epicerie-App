import { db } from './db';
import { product_list, sales } from './db/schema';
import { inArray, sql } from 'drizzle-orm';
import { updateStockAfterPayment } from './updateStock';
import { effectivePriceCents } from './pricing';

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
  const rows = await db.select().from(product_list).where(inArray(product_list.id, ids));

  const byId = new Map(rows.map((r) => [r.id, r]));

  const items = [];
  let totalCents = 0;

  for (const [id, qty] of qtyById) {
    const row = byId.get(id);
    if (!row) throw new Error(`Produit introuvable (${id})`);
    if (row.is_active === false) throw new Error(`Produit indisponible : ${productName(row)}`);
    if (shelfStock(row) < qty) {
      throw new Error(`Stock insuffisant pour ${productName(row)}`);
    }

    const unitCents = effectivePriceCents(row.price_chf, row.discount_percent);
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

  const receipt = items.map((i) => `${i.name} x${i.qty}`).join(', ');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // ON CONFLICT DO NOTHING : ne renvoie une ligne que si l'insert a réellement eu lieu.
  const inserted = await db
    .insert(sales)
    .values({
      order_ref: orderRef,
      created_at: new Date().toISOString(),
      client_name: clientName || null,
      user_id: userId || null,
      receipt,
      price: priceCents,
      items_json: items,
      expires_at: expiresAt,
    })
    .onConflictDoNothing({ target: sales.order_ref })
    .returning({ order_ref: sales.order_ref });

  if (inserted.length === 0) {
    return { alreadyProcessed: true };
  }

  await updateStockAfterPayment(items);

  if (userId) {
    try {
      // total_spent est en CHF (numeric), priceCents est en centimes : convertir.
      await db.execute(sql`select increment_total_spent(${userId}::uuid, ${priceCents / 100})`);
    } catch (e) {
      console.error('increment_total_spent failed:', e.message);
    }
  }

  return { alreadyProcessed: false };
}
