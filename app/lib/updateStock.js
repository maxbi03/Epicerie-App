import { db } from './db';
import { product_list } from './db/schema';
import { eq } from 'drizzle-orm';

/**
 * Décrémente stock_shelf dans product_list pour chaque article acheté.
 */
export async function updateStockAfterPayment(items) {
  const errors = [];

  for (const item of items) {
    try {
      const rows = await db
        .select({ id: product_list.id, stock_shelf: product_list.stock_shelf })
        .from(product_list)
        .where(eq(product_list.id, item.id))
        .limit(1);

      const product = rows[0];
      if (!product) {
        errors.push({ id: item.id, error: 'Produit introuvable' });
        continue;
      }

      const currentStock = product.stock_shelf ?? 0;
      const newStock = Math.max(0, currentStock - item.qty);

      await db.update(product_list).set({ stock_shelf: newStock }).where(eq(product_list.id, item.id));
      console.log(`Stock updated: ${item.name} (shelf): ${currentStock} → ${newStock}`);
    } catch (e) {
      console.error(`Failed to update stock for product ${item.id}:`, e.message);
      errors.push({ id: item.id, error: e.message });
    }
  }

  return { success: errors.length === 0, errors };
}
