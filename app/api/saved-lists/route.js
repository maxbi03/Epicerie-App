import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { requireAuth } from '../../lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { data, error } = await getSupabaseAdmin()
    .from('saved_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { name, items } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'Liste vide' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('saved_lists')
    .insert({ user_id: user.id, name: name.trim(), items })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request) {
  const { user, response } = await requireAuth(request);
  if (response) return response;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  // Make sure the list belongs to the user
  const { error } = await getSupabaseAdmin()
    .from('saved_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
