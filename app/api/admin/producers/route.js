import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { producers } from '../../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';

const LIST_COLUMNS = {
  id: producers.id, name: producers.name, contact_name: producers.contact_name,
  email: producers.email, phone: producers.phone, address: producers.address,
  description: producers.description, is_active: producers.is_active, created_at: producers.created_at,
};
const RETURN_COLUMNS = {
  id: producers.id, name: producers.name, contact_name: producers.contact_name,
  email: producers.email, phone: producers.phone, address: producers.address,
  description: producers.description, is_active: producers.is_active,
};

export async function GET() {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const data = await db.select(LIST_COLUMNS).from(producers).orderBy(asc(producers.name));
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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

  try {
    const [data] = await db
      .insert(producers)
      .values({ name, contact_name, email, phone, address, description, password_hash, is_active: true })
      .returning(RETURN_COLUMNS);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    if (e.code === '23505') return NextResponse.json({ error: 'Email déjà utilisé' }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
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

  try {
    const [data] = await db.update(producers).set(updates).where(eq(producers.id, id)).returning(RETURN_COLUMNS);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

  try {
    await db.delete(producers).where(eq(producers.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
