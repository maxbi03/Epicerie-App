import { createMollieClient } from '@mollie/api-client';
import { NextResponse } from 'next/server';
import { updateStockAfterPayment } from '../../../lib/updateStock';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

export async function POST(request) {
  try {
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

      // Record sale
      const receipt = items.map(i => `${i.name} x${i.qty}`).join(', ');
      const { error: saleError } = await getSupabaseAdmin()
        .from('sales')
        .insert({
          created_at: new Date().toISOString(),
          client_name: payment.metadata.client_name || null,
          client_email: payment.metadata.client_email || null,
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
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
