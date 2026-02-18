// services/userService.js
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
    .single();

  if (error) {
    // Si aucun profil n'existe, on renvoie null
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createUserProfile(profile) {
  const { error } = await supabase.from('users').insert(profile);
  if (error) throw error;
  return true;
}

export async function updateUserProfile(userId, patch) {
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw error;
  return true;
}