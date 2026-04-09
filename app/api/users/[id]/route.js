import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { getSession } from '../../../lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  // Vérifier que l'utilisateur connecté modifie uniquement son propre profil
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  if (session.userId !== id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const patch = await request.json();

  // Champs autorisés à modifier (pas password_hash, pas phone_verified, pas id)
  const ALLOWED = ['name', 'phone', 'address', 'postal_code', 'city', 'country'];
  const safePatch = {};
  for (const key of ALLOWED) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .update(safePatch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
