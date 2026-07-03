import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { getSession } from '../../lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request) {
  // Un utilisateur ne peut modifier que son propre profil, et jamais les
  // champs sensibles (phone_verified, role, total_spent, email…) qui sont
  // gérés exclusivement par les flux serveur dédiés.
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const profile = await request.json();

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .update({
      name: profile.name ?? null,
      phone: profile.phone ?? null,
      address: profile.address ?? null,
      street: profile.street ?? null,
      house_number: profile.house_number ?? null,
      postal_code: profile.postal_code ?? null,
      city: profile.city ?? null,
      country: profile.country ?? 'CH',
      address_label: profile.address_label ?? null,
      address_verified: profile.address_verified ?? false,
    })
    .eq('id', session.userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
