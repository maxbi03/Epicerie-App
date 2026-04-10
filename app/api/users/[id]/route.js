import { getSupabaseAdmin } from '../../../lib/supabaseServer';
import { getSession } from '../../../lib/auth';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.userId !== id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const patch = await request.json();

  // Champs autorisés à modifier
  const ALLOWED = ['name', 'phone', 'address', 'postal_code', 'city', 'country', 'address_verified'];
  const safePatch = {};
  for (const key of ALLOWED) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }

  // Si le téléphone change, remettre phone_verified à false
  if (safePatch.phone !== undefined) {
    const { data: current } = await getSupabaseAdmin()
      .from('users')
      .select('phone')
      .eq('id', id)
      .single();
    if (current && current.phone !== safePatch.phone) {
      safePatch.phone_verified = false;
    }
  }

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .update(safePatch)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.userId !== id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { password } = await request.json();
  if (!password) return NextResponse.json({ error: 'Mot de passe requis' }, { status: 400 });

  const argon2 = (await import('argon2')).default ?? (await import('argon2'));

  // Vérifier le mot de passe avant suppression
  const { data: user } = await getSupabaseAdmin()
    .from('users')
    .select('password_hash, avatar_url')
    .eq('id', id)
    .single();

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 400 });

  // Supprimer l'avatar du storage si existant
  if (user.avatar_url) {
    const oldPath = user.avatar_url.split('/avatars/')[1];
    if (oldPath) {
      await getSupabaseAdmin().storage.from('avatars').remove([oldPath]);
    }
  }

  // Supprimer le compte
  const { error } = await getSupabaseAdmin()
    .from('users')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
