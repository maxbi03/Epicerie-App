import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { producers } from '../../../lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { adminProducerCreateSchema, adminProducerUpdateSchema, adminProducerDeleteSchema } from '../../../lib/schemas';
import { parseBody } from '../../../lib/validation';

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

  const { data, error: validationError } = await parseBody(request, adminProducerCreateSchema);
  if (validationError) return validationError;
  const { name, contact_name, email, phone, address, description, password } = data;

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

  const { data, error: validationError } = await parseBody(request, adminProducerUpdateSchema);
  if (validationError) return validationError;
  const { id, password, ...fields } = data;

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

  const { data, error: validationError } = await parseBody(request, adminProducerDeleteSchema);
  if (validationError) return validationError;

  try {
    await db.delete(producers).where(eq(producers.id, data.id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
