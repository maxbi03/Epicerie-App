import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { requireAdmin } from '../../../lib/adminUtils';

const TABLE = 'producers';

export async function GET() {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select('id, name, contact_name, email, phone, address, description, is_active, created_at')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { name, contact_name, email, phone, address, description, password } = await request.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 });
  }

  const argon2 = (await import('argon2')).default ?? (await import('argon2'));
  const password_hash = await argon2.hash(password);

  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .insert({ name, contact_name, email, phone, address, description, password_hash, is_active: true })
    .select('id, name, contact_name, email, phone, address, description, is_active')
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id, password, ...fields } = await request.json();
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const updates = { ...fields };
  if (password) {
    const argon2 = (await import('argon2')).default ?? (await import('argon2'));
    updates.password_hash = await argon2.hash(password);
  }

  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select('id, name, contact_name, email, phone, address, description, is_active')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  const { error } = await getSupabaseAdmin().from(TABLE).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
