import { NextResponse } from 'next/server';

/**
 * Parse le body JSON d'une requête et le valide contre un schéma zod.
 * Retourne soit { data } (validé, typé), soit { error } (NextResponse 400
 * prête à renvoyer telle quelle — `if (error) return error;`).
 */
export async function parseBody(request, schema) {
  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message || 'Requête invalide.';
    return { data: null, error: NextResponse.json({ error: message }, { status: 400 }) };
  }
  return { data: result.data, error: null };
}
