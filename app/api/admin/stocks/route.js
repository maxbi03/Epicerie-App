import { db } from '../../../lib/db';
import { product_list } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';
import { adminStocksBulkUpdateSchema } from '../../../lib/schemas';
import { parseBody } from '../../../lib/validation';

export async function PATCH(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { data, error: validationError } = await parseBody(request, adminStocksBulkUpdateSchema);
  if (validationError) return validationError;
  const { updates } = data;

  const errors = [];

  for (const { id, stock_shelf } of updates) {
    try {
      await db.update(product_list).set({ stock_shelf: Math.max(0, Number(stock_shelf)) }).where(eq(product_list.id, id));
    } catch (e) {
      errors.push({ id, error: e.message });
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
