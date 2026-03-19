import { createMollieClient } from '@mollie/api-client';
import { NextResponse } from 'next/server';
import { updateStockAfterPayment } from '../../../lib/updateStock';

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

export async function POST(request) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    const payment = await mollieClient.payments.get(paymentId);

    if (payment.status === 'paid') {
      const items = JSON.parse(payment.metadata.items);
      const result = await updateStockAfterPayment(items);
      return NextResponse.json({ status: 'paid', stockUpdated: result.success });
    }

    return NextResponse.json({ status: payment.status });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
