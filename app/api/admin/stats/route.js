import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';
import { PRODUCTS_TABLE, SALES_TABLE } from '../../../lib/config';

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const sb = getSupabaseAdmin();

  const { count: totalProducts } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true });

  const { count: activeProducts } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: incomplete } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false);

  const { count: outOfStock } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('stock_shelf', 0);

  const { count: lowStock } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt('stock_shelf', 0)
    .lte('stock_shelf', 5);

  // Stock shelf stats
  const { count: shelfOutOfStock } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('stock_shelf', 0);

  const { count: shelfLow } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt('stock_shelf', 0)
    .lte('stock_shelf', 5);

  const { count: shelfOk } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt('stock_shelf', 5);

  // Stock back stats
  const { count: backOutOfStock } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('stock_back', 0);

  const { count: backLow } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt('stock_back', 0)
    .lte('stock_back', 5);

  const { count: backOk } = await sb
    .from(PRODUCTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .gt('stock_back', 5);

  // Sales stats
  const { count: totalSales } = await sb
    .from(SALES_TABLE)
    .select('*', { count: 'exact', head: true });

  const { data: salesData } = await sb
    .from(SALES_TABLE)
    .select('price, created_at');

  // Prices are stored in centimes (bigint), divide by 100 for display
  const totalRevenue = (salesData || []).reduce((sum, s) => sum + Number(s.price || 0), 0) / 100;

  // Sales today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const salesToday = (salesData || []).filter(s => s.created_at >= todayISO);
  const revenueToday = salesToday.reduce((sum, s) => sum + Number(s.price || 0), 0) / 100;

  // Sales this month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const salesMonth = (salesData || []).filter(s => s.created_at >= monthStart);
  const revenueMonth = salesMonth.reduce((sum, s) => sum + Number(s.price || 0), 0) / 100;

  return NextResponse.json({
    totalProducts: totalProducts ?? 0,
    activeProducts: activeProducts ?? 0,
    incomplete: incomplete ?? 0,
    outOfStock: outOfStock ?? 0,
    lowStock: lowStock ?? 0,
    shelf: { outOfStock: shelfOutOfStock ?? 0, low: shelfLow ?? 0, ok: shelfOk ?? 0 },
    back: { outOfStock: backOutOfStock ?? 0, low: backLow ?? 0, ok: backOk ?? 0 },
    sales: {
      total: totalSales ?? 0,
      today: salesToday.length,
      month: salesMonth.length,
      totalRevenue,
      revenueToday,
      revenueMonth,
    },
  });
}
