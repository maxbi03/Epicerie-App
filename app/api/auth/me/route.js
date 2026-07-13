import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { users } from '../../../lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id, name: users.name, email: users.email, phone: users.phone,
      phone_verified: users.phone_verified, email_verified: users.email_verified,
      address: users.address, postal_code: users.postal_code, city: users.city,
      country: users.country, address_verified: users.address_verified,
      avatar_url: users.avatar_url, total_spent: users.total_spent, role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
