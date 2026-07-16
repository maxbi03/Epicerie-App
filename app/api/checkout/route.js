import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PAYMENT_GATEWAY } from '../../lib/config';
import { getSession } from '../../lib/auth';
import { db } from '../../lib/db';
import { users } from '../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { loadCartPricing } from '../../lib/checkout';
import { checkoutSchema } from '../../lib/schemas';
import { parseBody } from '../../lib/validation';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000';

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data, error: validationError } = await parseBody(request, checkoutSchema);
    if (validationError) return validationError;

    // Recalcul serveur : le client n'envoie que { id, quantity }. Prix et total
    // sont recalculés depuis la DB, jamais lus depuis la requête.
    let items, totalCents;
    try {
      ({ items, totalCents } = await loadCartPricing(data.items));
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    // Identité dérivée de la session, jamais du body.
    const [user] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const orderRef = randomUUID();
    const totalChf = (totalCents / 100).toFixed(2);
    const description = items.map((i) => `${i.name} x${i.qty}`).join(', ');

    const metadata = {
      items: JSON.stringify(items),
      client_name: user?.name || null,
      user_id: session.userId,
      order_ref: orderRef,
    };

    if (PAYMENT_GATEWAY === 'payrexx') {
      const { createPayrexxGateway } = await import('../../lib/payrexx.js');

      const gateway = await createPayrexxGateway({
        amountInCents: totalCents,
        currency: 'CHF',
        purpose: `Épico - ${description}`.substring(0, 255),
        successRedirectUrl: `${BASE_URL}/panier/confirmation?status=success`,
        failedRedirectUrl: `${BASE_URL}/panier/confirmation?status=failed`,
        referenceId: JSON.stringify(metadata),
      });

      return NextResponse.json({ checkoutUrl: gateway.link, paymentId: String(gateway.id) });
    }

    const { createMollieClient } = await import('@mollie/api-client');
    const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

    const paymentData = {
      amount: { currency: 'CHF', value: totalChf },
      description: `Épico - ${description}`.substring(0, 255),
      redirectUrl: `${BASE_URL}/panier/confirmation?status=success`,
      metadata,
    };

    const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1') || BASE_URL.includes('192.168.');
    if (!isLocal) {
      paymentData.webhookUrl = `${BASE_URL}/api/checkout/webhook`;
    }

    const payment = await mollieClient.payments.create(paymentData);
    console.log('Mollie payment created:', payment.id, `${totalChf} CHF`);
    return NextResponse.json({ checkoutUrl: payment.getCheckoutUrl(), paymentId: payment.id });
  } catch (error) {
    console.error('Payment error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création du paiement' },
      { status: 500 }
    );
  }
}
