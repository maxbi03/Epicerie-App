import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';
import { PRODUCTS_TABLE, SALES_TABLE } from '../../../lib/config';

const DEFAULT_STOCK_THRESHOLD = 3;

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const sb = getSupabaseAdmin();

  // Produits actifs sous le seuil de stock rayon
  const { data: belowThresholdProducts } = await sb
    .from(PRODUCTS_TABLE)
    .select('id, name, stock_shelf')
    .eq('is_active', true)
    .lt('stock_shelf', DEFAULT_STOCK_THRESHOLD)
    .order('stock_shelf', { ascending: true });

  const belowThreshold = belowThresholdProducts || [];

  // Ventes
  const { data: salesData } = await sb
    .from(SALES_TABLE)
    .select('price, created_at');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const yearStart  = new Date(today.getFullYear(), 0, 1).toISOString();

  const allSales = salesData || [];

  const salesToday = allSales.filter(s => s.created_at >= todayISO);
  const salesMonth = allSales.filter(s => s.created_at >= monthStart);
  const salesYear  = allSales.filter(s => s.created_at >= yearStart);

  const revenueToday = salesToday.reduce((sum, s) => sum + Number(s.price || 0), 0) / 100;
  const revenueMonth = salesMonth.reduce((sum, s) => sum + Number(s.price || 0), 0) / 100;
  const revenueYear  = salesYear.reduce((sum, s)  => sum + Number(s.price || 0), 0) / 100;

  // Graphique 7 jours (pour le sous-menu ventes)
  const chart7d = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);
    const daySales = allSales.filter(s => s.created_at?.slice(0, 10) === dayStr);
    return {
      date: dayStr,
      revenue: daySales.reduce((sum, s) => sum + Number(s.price || 0), 0) / 100,
      count: daySales.length,
    };
  });

  // Produits (pour le sous-menu produits)
  const { count: totalProducts }  = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true });
  const { count: activeProducts } = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', true);
  const { count: inactive }       = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', false);

  const { count: shelfOut } = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', true).eq('stock_shelf', 0);
  const { count: shelfLow } = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', true).gt('stock_shelf', 0).lte('stock_shelf', 5);
  const { count: shelfOk }  = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', true).gt('stock_shelf', 5);
  const { count: backOut }  = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', true).eq('stock_back', 0);
  const { count: backLow }  = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', true).gt('stock_back', 0).lte('stock_back', 5);
  const { count: backOk }   = await sb.from(PRODUCTS_TABLE).select('*', { count: 'exact', head: true }).eq('is_active', true).gt('stock_back', 5);

  return NextResponse.json({
    sales: {
      today: salesToday.length,
      month: salesMonth.length,
      year:  salesYear.length,
      revenueToday,
      revenueMonth,
      revenueYear,
    },
    belowThreshold,
    chart7d,
    products: {
      total: totalProducts ?? 0,
      active: activeProducts ?? 0,
      inactive: inactive ?? 0,
      shelf: { out: shelfOut ?? 0, low: shelfLow ?? 0, ok: shelfOk ?? 0 },
      back:  { out: backOut  ?? 0, low: backLow  ?? 0, ok: backOk  ?? 0 },
    },
  });
}
