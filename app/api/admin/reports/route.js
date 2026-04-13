import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // 'pending' | 'resolved' | null = all

  const sb = getSupabaseAdmin();
  let query = sb
    .from('reports')
    .select('*, users(name, email)')
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}

export async function PATCH(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, status } = await request.json();
  if (!id || !['pending', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('reports')
    .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  const { authorized } = await requireAdmin(request);
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  const { error } = await getSupabaseAdmin().from('reports').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
