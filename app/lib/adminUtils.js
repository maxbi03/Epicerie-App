import { getSession } from './auth';

export function isAdmin(email) {
  if (!email) return false;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.email) return { authorized: false };
  if (!isAdmin(session.email)) return { authorized: false };
  return { authorized: true, user: session };
}
