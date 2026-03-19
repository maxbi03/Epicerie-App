import { createMollieClient } from '@mollie/api-client';
import { NextResponse } from 'next/server';

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
      // Payment successful - you can update stock, save order to Supabase, etc.
      console.log('Payment successful!', payment.metadata);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 });
  }
}
