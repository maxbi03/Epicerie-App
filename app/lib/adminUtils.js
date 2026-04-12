import { getSession } from './auth';
import { getSupabaseAdmin } from './supabaseServer';

export async function requireAdmin() {
  const session = await getSession();
  if (!session?.userId) return { authorized: false };

  const { data: user } = await getSupabaseAdmin()
    .from('users')
    .select('role')
    .eq('id', session.userId)
    .single();

  if (!user || user.role !== 'admin') return { authorized: false };
  return { authorized: true, user: session };
}
