import { getSupabaseAdmin } from './supabaseServer';

export function isAdmin(email) {
  if (!email) return false;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  if (!adminEmail) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}

export async function requireAdmin(request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return { authorized: false };
  }

  const token = auth.slice(7);
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);

  if (error || !data?.user) {
    return { authorized: false };
  }

  if (!isAdmin(data.user.email)) {
    return { authorized: false };
  }

  return { authorized: true, user: data.user };
}
