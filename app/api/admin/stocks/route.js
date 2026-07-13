import { db } from '../../../lib/db';
import { product_list } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { updates } = await request.json();

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'Liste de mises à jour requise' }, { status: 400 });
  }

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
