import { getSupabaseAdmin } from '../../lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const profile = await request.json();

  if (!profile.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .upsert({
      id: profile.id,
      name: profile.name ?? null,
      email: profile.email ?? null,
      phone: profile.phone ?? null,
      address: profile.address ?? null,
      street: profile.street ?? null,
      house_number: profile.house_number ?? null,
      postal_code: profile.postal_code ?? null,
      city: profile.city ?? null,
      country: profile.country ?? 'CH',
      address_label: profile.address_label ?? null,
      address_verified: profile.address_verified ?? false,
      phone_verified: profile.phone_verified ?? false,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
