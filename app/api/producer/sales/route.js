import { NextResponse } from 'next/server';
import { requireProducer } from '../../../lib/producerAuth';
import { db } from '../../../lib/db';
import { producers, product_list, sales as salesTable } from '../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const { authorized, session } = await requireProducer();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  // Récupérer les noms des produits du producteur
  const [producer] = await db
    .select({ name: producers.name })
    .from(producers)
    .where(eq(producers.id, session.producerId))
    .limit(1);

  if (!producer) return NextResponse.json({ error: 'Producteur introuvable' }, { status: 404 });

  const products = await db
    .select({ id: product_list.id, name: product_list.name, price_chf: product_list.price_chf })
    .from(product_list)
    .where(eq(product_list.producer, producer.name));

  if (products.length === 0) return NextResponse.json([]);

  const productNames = products.map(p => p.name);

  // Récupérer toutes les ventes et filtrer celles qui contiennent au moins un produit du producteur
  const sales = await db
    .select({ id: salesTable.id, price: salesTable.price, receipt: salesTable.receipt, created_at: salesTable.created_at })
    .from(salesTable)
    .orderBy(desc(salesTable.created_at));

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
