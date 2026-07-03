import { getSession } from './auth';
import { getSupabaseAdmin } from './supabaseServer';

export async function requireProducer() {
  const session = await getSession();
  if (!session?.userId) return { authorized: false, session: null };

  // Source de vérité : l'existence d'une ligne `producers` liée à cet utilisateur.
  // (Le JWT ne porte pas le rôle ; ne pas s'y fier.)
  const { data: producer } = await getSupabaseAdmin()
    .from('producers')
    .select('id, name')
    .eq('user_id', session.userId)
    .maybeSingle();

  if (!producer) return { authorized: false, session: null };
  return { authorized: true, session: { ...session, producerId: producer.id } };
}
