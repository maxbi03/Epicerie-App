import { supabase } from '../supabaseClient.js';

// Session
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

// Profil utilisateur
export async function fetchUserProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createUserProfile(profile) {
  const payload = {
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
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId, patch) {
  const payload = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.email !== undefined ? { email: patch.email } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.address !== undefined ? { address: patch.address } : {}),
    ...(patch.street !== undefined ? { street: patch.street } : {}),
    ...(patch.house_number !== undefined ? { house_number: patch.house_number } : {}),
    ...(patch.postal_code !== undefined ? { postal_code: patch.postal_code } : {}),
    ...(patch.city !== undefined ? { city: patch.city } : {}),
    ...(patch.country !== undefined ? { country: patch.country } : {}),
    ...(patch.address_label !== undefined ? { address_label: patch.address_label } : {}),
    ...(patch.address_verified !== undefined ? { address_verified: patch.address_verified } : {}),
  };

  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}