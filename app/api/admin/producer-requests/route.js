import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../lib/adminUtils';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view') || 'proposals';

  const sb = getSupabaseAdmin();

  if (view === 'invoices') {
    const { data, error } = await sb
      .from('producer_invoices')
      .select('*, producers(name, email)')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // proposals (default)
  const { data, error } = await sb
    .from('producer_proposals')
    .select('*, producers(name, email)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, type, status, admin_note } = await request.json();
  if (!id || !status) return NextResponse.json({ error: 'id et status requis' }, { status: 400 });

  const sb = getSupabaseAdmin();

  if (type === 'invoice') {
    const updates = { status };
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    const { data, error } = await sb
      .from('producer_invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // proposal
  const { data, error } = await sb
    .from('producer_proposals')
    .update({ status, admin_note: admin_note || null })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
