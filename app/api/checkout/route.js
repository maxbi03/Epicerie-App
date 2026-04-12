import { NextResponse } from 'next/server';
import { PAYMENT_GATEWAY } from '../../lib/config';

export async function POST(request) {
  try {
    const { items, total, client_name, user_id } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 });
    }

    const description = items
      .map(item => `${item.name} x${item.quantity}`)
      .join(', ');

    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';
    const metadata = {
      items: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price }))),
      client_name: client_name || null,
      user_id: user_id || null,
    };

    if (PAYMENT_GATEWAY === 'payrexx') {
      const { createPayrexxGateway } = await import('../../lib/payrexx.js');

      const gateway = await createPayrexxGateway({
        amountInCents: Math.round(Number(total) * 100),
        currency: 'CHF',
        purpose: `Épico - ${description}`.substring(0, 255),
        successRedirectUrl: `${baseUrl}/panier/confirmation?status=success`,
        failedRedirectUrl: `${baseUrl}/panier/confirmation?status=failed`,
        referenceId: JSON.stringify(metadata),
      });

      console.log('Payrexx gateway created:', gateway.id);
      return NextResponse.json({ checkoutUrl: gateway.link, paymentId: String(gateway.id) });

    } else {
      const { createMollieClient } = await import('@mollie/api-client');
      const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

      const paymentData = {
        amount: { currency: 'CHF', value: Number(total).toFixed(2) },
        description: `Épico - ${description}`.substring(0, 255),
        redirectUrl: `${baseUrl}/panier/confirmation?status=success`,
        metadata,
      };

      const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('192.168.');
      if (!isLocal) {
        paymentData.webhookUrl = `${baseUrl}/api/checkout/webhook`;
      }

      console.log('Creating Mollie payment:', JSON.stringify(paymentData));
      const payment = await mollieClient.payments.create(paymentData);
      return NextResponse.json({ checkoutUrl: payment.getCheckoutUrl(), paymentId: payment.id });
    }
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
