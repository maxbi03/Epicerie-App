import { getSession } from './auth';
import { db } from './db';
import { producers } from './db/schema';
import { eq } from 'drizzle-orm';

export async function requireProducer() {
  const session = await getSession();
  if (!session?.userId) return { authorized: false, session: null };

  // Source de vérité : l'existence d'une ligne `producers` liée à cet utilisateur.
  // (Le JWT ne porte pas le rôle ; ne pas s'y fier.)
  const rows = await db
    .select({ id: producers.id, name: producers.name })
    .from(producers)
    .where(eq(producers.user_id, session.userId))
    .limit(1);
  const producer = rows[0];

  if (!producer) return { authorized: false, session: null };
  return { authorized: true, session: { ...session, producerId: producer.id } };
}
