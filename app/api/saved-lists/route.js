import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { getSession } from '../../lib/auth';
import { NextResponse } from 'next/server';

async function auth() {
  const session = await getSession();
  if (!session) return { userId: null, error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  return { userId: session.userId, error: null };
}

export async function GET() {
  const { userId, error } = await auth();
  if (error) return error;

  const { data, err } = await getSupabaseAdmin()
    .from('saved_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (err) return NextResponse.json({ error: err.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request) {
  const { userId, error } = await auth();
  if (error) return error;

  const { name, items } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Nom requis' }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: 'Liste vide' }, { status: 400 });

  const { data, error: dbError } = await getSupabaseAdmin()
    .from('saved_lists')
    .insert({ user_id: userId, name: name.trim(), items })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request) {
  const { userId, error } = await auth();
  if (error) return error;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  const { error: dbError } = await getSupabaseAdmin()
    .from('saved_lists')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
