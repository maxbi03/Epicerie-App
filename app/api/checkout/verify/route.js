import { createMollieClient } from '@mollie/api-client';
import { NextResponse } from 'next/server';
import { updateStockAfterPayment } from '../../../lib/updateStock';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

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
      const receipt = items.map(i => `${i.name} x${i.qty}`).join(', ');
      const sb = getSupabaseAdmin();

      // Check if sale already recorded (by webhook) to avoid duplicates
      const { count } = await sb
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('price', Math.round(Number(payment.amount.value) * 100))
        .eq('receipt', receipt)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (count === 0) {
        const result = await updateStockAfterPayment(items);

        const { error: saleError } = await sb
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
        }

        return NextResponse.json({ status: 'paid', stockUpdated: result.success });
      }

      return NextResponse.json({ status: 'paid', stockUpdated: true });
    }

    return NextResponse.json({ status: payment.status });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
