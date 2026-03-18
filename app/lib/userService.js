import { supabase } from './supabaseClient';

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function fetchUserProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUserProfile(profile) {
  const { data, error } = await supabase
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
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId, patch) {
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}