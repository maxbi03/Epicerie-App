import { NextResponse } from 'next/server';
import { updateStockAfterPayment } from '../../../lib/updateStock';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { SALES_TABLE, PAYMENT_GATEWAY } from '../../../lib/config';

export async function POST(request) {
  try {
    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 });
    }

    if (PAYMENT_GATEWAY === 'payrexx') {
      const { getPayrexxGateway } = await import('../../../lib/payrexx.js');

      const gateway = await getPayrexxGateway(paymentId);
      const status = gateway.status;

      // Payrexx gateway statuses: waiting, confirmed, authorized, reserved
      if (status === 'confirmed') {
        let metadata = {};
        try {
          metadata = JSON.parse(gateway.referenceId);
        } catch {
          return NextResponse.json({ status: 'paid', stockUpdated: false });
        }

        const items = JSON.parse(metadata.items);
        const receipt = items.map(i => `${i.name} x${i.qty}`).join(', ');
        const priceInCents = gateway.amount; // Payrexx stores amount in cents
        const sb = getSupabaseAdmin();

        // Anti-duplicate check
        const { count } = await sb
          .from(SALES_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('price', priceInCents)
          .eq('receipt', receipt)
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

        if (count === 0) {
          const result = await updateStockAfterPayment(items);
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const { error: saleError } = await sb
            .from(SALES_TABLE)
            .insert({
              created_at: new Date().toISOString(),
              client_name: metadata.client_name || null,
              user_id: metadata.user_id || null,
              receipt,
              price: priceInCents,
              items_json: items,
              expires_at: expiresAt,
            });

          if (saleError) {
            console.error('Failed to record sale:', saleError.message);
          }

          return NextResponse.json({ status: 'paid', stockUpdated: result.success });
        }

        return NextResponse.json({ status: 'paid', stockUpdated: true });
      }

      return NextResponse.json({ status: status === 'waiting' ? 'pending' : status });

    } else {
      const { createMollieClient } = await import('@mollie/api-client');
      const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

      const payment = await mollieClient.payments.get(paymentId);

      if (payment.status === 'paid') {
        const items = JSON.parse(payment.metadata.items);
        const receipt = items.map(i => `${i.name} x${i.qty}`).join(', ');
        const sb = getSupabaseAdmin();

        const { count } = await sb
          .from(SALES_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('price', Math.round(Number(payment.amount.value) * 100))
          .eq('receipt', receipt)
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

        if (count === 0) {
          const result = await updateStockAfterPayment(items);
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          const { error: saleError } = await sb
            .from(SALES_TABLE)
            .insert({
              created_at: new Date().toISOString(),
              client_name: payment.metadata.client_name || null,
              user_id: payment.metadata.user_id || null,
              receipt,
              price: Math.round(Number(payment.amount.value) * 100),
              items_json: items,
              expires_at: expiresAt,
            });

          if (saleError) {
            console.error('Failed to record sale:', saleError.message);
          }

          return NextResponse.json({ status: 'paid', stockUpdated: result.success });
        }

        return NextResponse.json({ status: 'paid', stockUpdated: true });
      }

      return NextResponse.json({ status: payment.status });
    }
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
