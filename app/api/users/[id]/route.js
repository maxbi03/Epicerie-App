import { getSupabaseAdmin } from '../../../lib/supabaseServer'; // Storage avatars uniquement (étape C)
import { getSession } from '../../../lib/auth';
import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';

const PROFILE_COLUMNS = {
  id: users.id, name: users.name, email: users.email, phone: users.phone,
  phone_verified: users.phone_verified, email_verified: users.email_verified,
  address: users.address, postal_code: users.postal_code, city: users.city,
  country: users.country, address_verified: users.address_verified,
  avatar_url: users.avatar_url, total_spent: users.total_spent,
};

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Authentification requise : un utilisateur ne peut lire que son propre profil
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.userId !== id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const [data] = await db.select(PROFILE_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
    return NextResponse.json(data ?? null);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  if (session.userId !== id) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const patch = await request.json();

  // Champs autorisés à modifier
  const ALLOWED = ['name', 'email', 'phone', 'address', 'postal_code', 'city', 'country', 'address_verified'];
  const safePatch = {};
  for (const key of ALLOWED) {
    if (patch[key] !== undefined) safePatch[key] = patch[key];
  }

  // Nom : trim + longueur minimale
  if (safePatch.name !== undefined) {
    safePatch.name = String(safePatch.name).trim();
    if (safePatch.name.length < 2) {
      return NextResponse.json({ error: 'Nom trop court (2 caractères minimum).' }, { status: 400 });
    }
  }

  // Email : normaliser, valider, vérifier l'unicité, réinitialiser email_verified si changé
  if (safePatch.email !== undefined) {
    const email = String(safePatch.email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'Format d\'email invalide.' }, { status: 400 });
    }
    safePatch.email = email;

    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (taken && taken.id !== id) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé.' }, { status: 409 });
    }

    const [current] = await db.select({ email: users.email }).from(users).where(eq(users.id, id)).limit(1);
    if (current && current.email !== email) safePatch.email_verified = false;
  }

  // Si le téléphone change, remettre phone_verified à false
  if (safePatch.phone !== undefined) {
    const [current] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, id)).limit(1);
    if (current && current.phone !== safePatch.phone) {
      safePatch.phone_verified = false;
    }
  }

  try {
    const [data] = await db.update(users).set(safePatch).where(eq(users.id, id)).returning(PROFILE_COLUMNS);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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
  const [user] = await db
    .select({ password_hash: users.password_hash, avatar_url: users.avatar_url })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 400 });

  // Supprimer l'avatar du storage si existant (Supabase Storage — étape C remplacera)
  if (user.avatar_url) {
    const oldPath = user.avatar_url.split('/avatars/')[1];
    if (oldPath) {
      try { await getSupabaseAdmin().storage.from('avatars').remove([oldPath]); }
      catch (e) { console.error('avatar remove failed:', e.message); }
    }
  }

  // Supprimer le compte
  try {
    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
