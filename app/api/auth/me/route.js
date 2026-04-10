import { NextResponse } from 'next/server';
import { getSession } from '../../../lib/auth';
import { getSupabaseAdmin } from '../../../lib/supabaseServer';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: user, error } = await getSupabaseAdmin()
    .from('users')
    .select('id, name, email, phone, phone_verified, email_verified, address, postal_code, city, country, address_verified, avatar_url, total_spent')
    .eq('id', session.userId)
    .single();

  if (error || !user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
