import { NextResponse } from 'next/server';
import { PAYMENT_GATEWAY } from '../../../lib/config';
import { finalizePaidOrder } from '../../../lib/checkout';

export async function POST(request) {
  try {
    const { paymentId } = await request.json();
    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    if (PAYMENT_GATEWAY === 'payrexx') {
      const { getPayrexxGateway } = await import('../../../lib/payrexx.js');
      const gateway = await getPayrexxGateway(paymentId);

      if (gateway.status === 'confirmed') {
        let metadata;
        try {
          metadata = JSON.parse(gateway.referenceId);
        } catch {
          return NextResponse.json({ status: 'paid', stockUpdated: false });
        }

        const items = JSON.parse(metadata.items);
        const { alreadyProcessed } = await finalizePaidOrder({
          orderRef: metadata.order_ref,
          items,
          clientName: metadata.client_name,
          userId: metadata.user_id,
          priceCents: Number(gateway.amount),
        });

        return NextResponse.json({ status: 'paid', stockUpdated: !alreadyProcessed });
      }

      return NextResponse.json({ status: gateway.status === 'waiting' ? 'pending' : gateway.status });
    }

    const { createMollieClient } = await import('@mollie/api-client');
    const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
    const payment = await mollieClient.payments.get(paymentId);

    if (payment.status === 'paid') {
      const items = JSON.parse(payment.metadata.items);
      const { alreadyProcessed } = await finalizePaidOrder({
        orderRef: payment.metadata.order_ref,
        items,
        clientName: payment.metadata.client_name,
        userId: payment.metadata.user_id,
        priceCents: Math.round(Number(payment.amount.value) * 100),
      });

      return NextResponse.json({ status: 'paid', stockUpdated: !alreadyProcessed });
    }

    return NextResponse.json({ status: payment.status });
  } catch (error) {
    console.error('Verify error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
