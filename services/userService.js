// services/userService.js
// Toutes les opérations sur la table `users` sont centralisées ici.

import { supabase } from '../supabaseClient.js';

// --------------------
// Session helpers
// --------------------
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session ?? null;
}

export async function getUserIdOrNull() {
  const session = await getSession();
  return session?.user?.id ?? null;
}

// --------------------
// users table helpers
// --------------------
export async function fetchUserProfile(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  // PGRST116 = "No rows found" (selon configuration)
  if (error) {
    // Si aucun profil n'existe, on renvoie null proprement
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createUserProfile(profile) {
  // profile attendu: { id, name, email, address, phone }
  const { error } = await supabase
    .from('users')
    .insert(profile);

  if (error) throw error;
  return true;
}

export async function updateUserProfile(userId, patch) {
  // patch = { name?, phone?, address?, ... }
  const { error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId);

  if (error) throw error;
  return true;
}