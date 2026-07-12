import { getSession } from './auth';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.userId) return { authorized: false };

  const rows = await db.select({ role: users.role }).from(users).where(eq(users.id, session.userId)).limit(1);
  const user = rows[0];

  if (!user || user.role !== 'admin') return { authorized: false };
  return { authorized: true, user: session };
}
