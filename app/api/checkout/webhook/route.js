import { NextResponse } from 'next/server';
import { updateStockAfterPayment } from '../../../lib/updateStock';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { SALES_TABLE, PAYMENT_GATEWAY } from '../../../lib/config';

export async function POST(request) {
  try {
    if (PAYMENT_GATEWAY === 'payrexx') {
      // Payrexx sends JSON webhook with transaction data
      const body = await request.json();
      const transaction = body.transaction;

      if (!transaction) {
        return NextResponse.json({ error: 'Missing transaction' }, { status: 400 });
      }

      console.log(`Payrexx webhook: transaction ${transaction.id}, status=${transaction.status}`);

      if (transaction.status === 'confirmed') {
        // referenceId contains our metadata JSON
        const referenceId = transaction.invoice?.referenceId || transaction.referenceId;
        let metadata = {};
        try {
          metadata = JSON.parse(referenceId);
        } catch {
          console.error('Failed to parse referenceId:', referenceId);
          return NextResponse.json({ received: true });
        }

        const items = JSON.parse(metadata.items);
        console.log('Payrexx payment confirmed! Updating stock...');
        const result = await updateStockAfterPayment(items);
        console.log('Stock update result:', result);

        const receipt = items.map(i => `${i.name} x${i.qty}`).join(', ');
        const { error: saleError } = await getSupabaseAdmin()
          .from(SALES_TABLE)
          .insert({
            created_at: new Date().toISOString(),
            client_name: metadata.client_name || null,
            user_id: metadata.user_id || null,
            receipt,
            price: Math.round(Number(transaction.amount) / 100 * 100),
          });

        if (saleError) {
          console.error('Failed to record sale:', saleError.message);
        } else {
          console.log('Sale recorded via Payrexx webhook');
        }
      }

      return NextResponse.json({ received: true });

    } else {
      // Mollie webhook
      const { createMollieClient } = await import('@mollie/api-client');
      const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

      const body = await request.text();
      const params = new URLSearchParams(body);
      const paymentId = params.get('id');

      if (!paymentId) {
        return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
      }

      const payment = await mollieClient.payments.get(paymentId);
      console.log(`Payment ${paymentId}: status=${payment.status}`);

      if (payment.status === 'paid') {
        const items = JSON.parse(payment.metadata.items);
        console.log('Payment successful! Updating stock...');
        const result = await updateStockAfterPayment(items);
        console.log('Stock update result:', result);

        const receipt = items.map(i => `${i.name} x${i.qty}`).join(', ');
        const { error: saleError } = await getSupabaseAdmin()
          .from(SALES_TABLE)
          .insert({
            created_at: new Date().toISOString(),
            client_name: payment.metadata.client_name || null,
            user_id: payment.metadata.user_id || null,
            receipt,
            price: Math.round(Number(payment.amount.value) * 100),
          });

        if (saleError) {
          console.error('Failed to record sale:', saleError.message);
        } else {
          console.log('Sale recorded:', paymentId);
        }
      }

      return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
