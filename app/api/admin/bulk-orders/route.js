import { db } from '../../../lib/db';
import { bulk_orders } from '../../../lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin as requireAdminUser } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

async function requireAdmin() {
  const { authorized, user } = await requireAdminUser();
  if (!authorized) {
    return { session: null, error: NextResponse.json({ error: 'Non autorisé' }, { status: 403 }) };
  }
  return { session: user, error: null };
}

// ── GET — liste toutes les commandes (filtre optionnel ?status=) ──
export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  try {
    const base = db.select().from(bulk_orders).orderBy(desc(bulk_orders.created_at));
    const data = status ? await base.where(eq(bulk_orders.status, status)) : await base;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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

  try {
    const [data] = await db
      .insert(bulk_orders)
      .values({
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
      .returning();
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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

  try {
    const [data] = await db.update(bulk_orders).set(filtered).where(eq(bulk_orders.id, id)).returning();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── DELETE — supprimer une commande ──
export async function DELETE(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requis.' }, { status: 400 });

  try {
    await db.delete(bulk_orders).where(eq(bulk_orders.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
