import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { getSession } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { BULK_ORDERS_TABLE } from '../../../lib/config';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return { session: null, error: NextResponse.json({ error: 'Non autorisé' }, { status: 403 }) };
  }
  return { session, error: null };
}

// ── GET — liste toutes les commandes (filtre optionnel ?status=) ──
export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  let query = getSupabaseAdmin()
    .from(BULK_ORDERS_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// ── POST — créer une commande ──
export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const {
    contact_name, contact_email, contact_phone,
    event_description, event_date,
    items, subtotal, discount_rate, total,
  } = body;

  if (!contact_name?.trim()) {
    return NextResponse.json({ error: 'Le nom du contact est requis.' }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Au moins un produit est requis.' }, { status: 400 });
  }
  if (subtotal < 20000) { // 200 CHF en centimes
    return NextResponse.json({ error: 'Minimum 200 CHF pour une grosse commande.' }, { status: 400 });
  }

  const { data, error: dbError } = await getSupabaseAdmin()
    .from(BULK_ORDERS_TABLE)
    .insert({
      contact_name: contact_name.trim(),
      contact_email: contact_email?.trim() || null,
      contact_phone: contact_phone?.trim() || null,
      event_description: event_description?.trim() || null,
      event_date: event_date || null,
      items,
      subtotal,
      discount_rate,
      total,
      status: 'pending',
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// ── PATCH — mettre à jour le statut / lien Stripe / notes ──
export async function PATCH(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 });

  const ALLOWED = ['status', 'stripe_payment_link', 'admin_notes'];
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => ALLOWED.includes(k))
  );

  // Horodater la résolution
  if (filtered.status === 'paid' || filtered.status === 'delivered') {
    filtered.resolved_at = new Date().toISOString();
  }

  const { data, error: dbError } = await getSupabaseAdmin()
    .from(BULK_ORDERS_TABLE)
    .update(filtered)
    .eq('id', id)
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE — supprimer une commande ──
export async function DELETE(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 });

  const { error: dbError } = await getSupabaseAdmin()
    .from(BULK_ORDERS_TABLE)
    .delete()
    .eq('id', id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
