import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { PRODUCTS_TABLE, SALES_TABLE } from '../../../lib/config';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sb = getSupabaseAdmin();

  // Récupérer les noms des produits du producteur
  const { data: producer } = await sb
    .from('producers')
    .select('name')
    .eq('id', session.producerId)
    .single();

  if (!producer) return NextResponse.json({ error: 'Producteur introuvable' }, { status: 404 });

  const { data: products } = await sb
    .from(PRODUCTS_TABLE)
    .select('id, name, price_chf')
    .eq('producer', producer.name);

  if (!products || products.length === 0) return NextResponse.json([]);

  const productNames = products.map(p => p.name);

  // Récupérer toutes les ventes et filtrer celles qui contiennent au moins un produit du producteur
  const { data: sales } = await sb
    .from(SALES_TABLE)
    .select('id, price, receipt, created_at')
    .order('created_at', { ascending: false });

  if (!sales) return NextResponse.json([]);

  // Parser le receipt (texte "Produit A, Produit B x2, Produit C")
  const producerSales = sales
    .map(sale => {
      const receiptItems = (sale.receipt || '').split(', ');
      const matchedItems = receiptItems
        .filter(item => productNames.some(name => item.includes(name)))
        .map(item => {
          const match = item.match(/^(.+?)(?:\s+x(\d+))?$/);
          const name = match?.[1]?.trim() || item;
          const qty = parseInt(match?.[2] || '1', 10);
          const product = products.find(p => name.includes(p.name));
          return product ? { name: product.name, qty, price_chf: product.price_chf } : null;
        })
        .filter(Boolean);

      if (matchedItems.length === 0) return null;

      const amount = matchedItems.reduce((s, i) => s + i.qty * Number(i.price_chf || 0), 0);
      return { id: sale.id, created_at: sale.created_at, items: matchedItems, amount };
    })
    .filter(Boolean);

  return NextResponse.json(producerSales);
}
