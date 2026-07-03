import { NextResponse } from 'next/server';
import { PAYMENT_GATEWAY } from '../../../lib/config';
import { finalizePaidOrder } from '../../../lib/checkout';

export async function POST(request) {
  try {
    if (PAYMENT_GATEWAY === 'payrexx') {
      // Ne JAMAIS faire confiance au corps du webhook : re-fetch la transaction
      // via l'API Payrexx pour vérifier son vrai statut et son montant.
      const body = await request.json();
      const txId = body?.transaction?.id;
      if (!txId) {
        return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
      }

      const { getPayrexxTransaction } = await import('../../../lib/payrexx.js');
      const tx = await getPayrexxTransaction(txId);
      console.log(`Payrexx webhook: transaction ${txId}, status=${tx?.status}`);

      if (tx?.status === 'confirmed') {
        const referenceId = tx.invoice?.referenceId || tx.referenceId;
        let metadata;
        try {
          metadata = JSON.parse(referenceId);
        } catch {
          console.error('Payrexx: referenceId illisible');
          return NextResponse.json({ received: true });
        }

        const items = JSON.parse(metadata.items);
        await finalizePaidOrder({
          orderRef: metadata.order_ref,
          items,
          clientName: metadata.client_name,
          userId: metadata.user_id,
          priceCents: Number(tx.amount),
        });
      }

      return NextResponse.json({ received: true });
    }

    // Mollie : re-fetch le paiement via l'API (le body ne porte que l'id).
    const { createMollieClient } = await import('@mollie/api-client');
    const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

    const rawBody = await request.text();
    const paymentId = new URLSearchParams(rawBody).get('id');
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    const payment = await mollieClient.payments.get(paymentId);
    console.log(`Mollie webhook: payment ${paymentId}, status=${payment.status}`);

    if (payment.status === 'paid') {
      const items = JSON.parse(payment.metadata.items);
      await finalizePaidOrder({
        orderRef: payment.metadata.order_ref,
        items,
        clientName: payment.metadata.client_name,
        userId: payment.metadata.user_id,
        priceCents: Math.round(Number(payment.amount.value) * 100),
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
