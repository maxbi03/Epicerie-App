import { getSupabaseAdmin } from './supabaseServer';
import { PRODUCTS_TABLE, PRODUCTS_ID } from './config';

/**
 * Decrement stock_shelf in the 'products' table for each purchased item.
 */
export async function updateStockAfterPayment(items) {
  const supabase = getSupabaseAdmin();
  const errors = [];

  for (const item of items) {
    // Get current shelf stock
    const { data: product, error: fetchError } = await supabase
      .from(PRODUCTS_TABLE)
      .select('id, stock_shelf')
      .eq(PRODUCTS_ID, item.id)
      .single();

    if (fetchError) {
      console.error(`Failed to fetch product ${item.id}:`, fetchError.message);
      errors.push({ id: item.id, error: fetchError.message });
      continue;
    }

    const currentStock = product.stock_shelf ?? 0;
    const newStock = Math.max(0, currentStock - item.qty);

    const { error: updateError } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ stock_shelf: newStock })
      .eq(PRODUCTS_ID, item.id);

    if (updateError) {
      console.error(`Failed to update stock for product ${item.id}:`, updateError.message);
      errors.push({ id: item.id, error: updateError.message });
    } else {
      console.log(`Stock updated: ${item.name} (shelf): ${currentStock} → ${newStock}`);
    }
  }

  return { success: errors.length === 0, errors };
}
