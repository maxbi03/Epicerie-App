import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '../../../lib/adminUtils';
import { adminUserActionSchema } from '../../../lib/schemas';
import { parseBody } from '../../../lib/validation';

const USER_COLUMNS = {
  id: users.id, name: users.name, email: users.email, phone: users.phone,
  phone_verified: users.phone_verified, email_verified: users.email_verified,
  address: users.address, postal_code: users.postal_code, city: users.city,
  country: users.country, address_verified: users.address_verified,
  role: users.role, total_spent: users.total_spent, created_at: users.created_at,
  avatar_url: users.avatar_url,
};

export async function GET() {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const data = await db.select(USER_COLUMNS).from(users);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/admin/users — actions admin sur un utilisateur
// Body: { action: 'reset_spent', userId }
export async function PATCH(request) {
  const { authorized } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  const { data, error: validationError } = await parseBody(request, adminUserActionSchema);
  if (validationError) return validationError;
  const { action, userId } = data;

  if (action === 'reset_spent') {
    if (!userId) return NextResponse.json({ error: 'userId requis' }, { status: 400 });

    try {
      await db.update(users).set({ total_spent: 0 }).where(eq(users.id, userId));
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}
