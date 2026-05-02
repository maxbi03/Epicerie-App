import { getSession } from './auth';
import { getSupabaseAdmin } from './supabaseServer';

export async function requireProducer() {
  const session = await getSession();
  if (!session || session.role !== 'producer') return { authorized: false, session: null };

  const { data: producer } = await getSupabaseAdmin()
    .from('producers')
    .select('id, name')
    .eq('user_id', session.userId)
    .single();

  if (!producer) return { authorized: false, session: null };
  return { authorized: true, session: { ...session, producerId: producer.id } };
}
