import { db } from '../../../lib/db';
import { product_list, sales } from '../../../lib/db/schema';
import { and, eq, gt, lt, lte, asc, sql } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

const DEFAULT_STOCK_THRESHOLD = 3;

async function countProducts(where) {
  const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(product_list).where(where);
  return count;
}

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  // Produits actifs sous le seuil de stock rayon
  const belowThreshold = await db
    .select({ id: product_list.id, name: product_list.name, stock_shelf: product_list.stock_shelf })
    .from(product_list)
    .where(and(eq(product_list.is_active, true), lt(product_list.stock_shelf, DEFAULT_STOCK_THRESHOLD)))
    .orderBy(asc(product_list.stock_shelf));

  // Ventes
  const allSales = await db.select({ price: sales.price, created_at: sales.created_at }).from(sales);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const yearStart  = new Date(today.getFullYear(), 0, 1).toISOString();

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
  const totalProducts  = await countProducts(undefined);
  const activeProducts = await countProducts(eq(product_list.is_active, true));
  const inactive       = await countProducts(eq(product_list.is_active, false));

  const shelfOut = await countProducts(and(eq(product_list.is_active, true), eq(product_list.stock_shelf, 0)));
  const shelfLow = await countProducts(and(eq(product_list.is_active, true), gt(product_list.stock_shelf, 0), lte(product_list.stock_shelf, 5)));
  const shelfOk  = await countProducts(and(eq(product_list.is_active, true), gt(product_list.stock_shelf, 5)));
  const backOut  = await countProducts(and(eq(product_list.is_active, true), eq(product_list.stock_back, 0)));
  const backLow  = await countProducts(and(eq(product_list.is_active, true), gt(product_list.stock_back, 0), lte(product_list.stock_back, 5)));
  const backOk   = await countProducts(and(eq(product_list.is_active, true), gt(product_list.stock_back, 5)));

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
