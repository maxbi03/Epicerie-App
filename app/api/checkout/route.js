import { createMollieClient } from '@mollie/api-client';
import { NextResponse } from 'next/server';

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

export async function POST(request) {
  try {
    const { items, total } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Panier vide' }, { status: 400 });
    }

    // Build description from items
    const description = items
      .map(item => `${item.name} x${item.quantity}`)
      .join(', ');

    const baseUrl = request.headers.get('origin') || 'http://localhost:3000';

    const paymentData = {
      amount: {
        currency: 'CHF',
        value: Number(total).toFixed(2),
      },
      description: `Épico - ${description}`.substring(0, 255),
      redirectUrl: `${baseUrl}/panier/confirmation?status=success`,
      metadata: {
        items: JSON.stringify(items.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price }))),
      },
    };

    // Webhook only works with public URLs, skip for local dev
    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('192.168.');
    if (!isLocal) {
      paymentData.webhookUrl = `${baseUrl}/api/checkout/webhook`;
    }

    console.log('Creating Mollie payment:', JSON.stringify(paymentData));
    const payment = await mollieClient.payments.create(paymentData);

    return NextResponse.json({ checkoutUrl: payment.getCheckoutUrl(), paymentId: payment.id });
  } catch (error) {
    console.error('Mollie payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
