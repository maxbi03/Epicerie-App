import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const sb = getSupabaseAdmin();

  const { count: totalProducts } = await sb
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: outOfStock } = await sb
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('stock_shelf', 0);

  const { count: lowStock } = await sb
    .from('products')
    .select('*', { count: 'exact', head: true })
    .gt('stock_shelf', 0)
    .lte('stock_shelf', 5);

  return NextResponse.json({
    totalProducts: totalProducts ?? 0,
    outOfStock: outOfStock ?? 0,
    lowStock: lowStock ?? 0,
  });
}
