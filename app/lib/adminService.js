import { supabase } from './supabaseClient';

async function getAdminHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Non authentifié');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

export async function fetchAdminProducts() {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/products', { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (admin products)');
  }
  return res.json();
}

export async function fetchAdminStats() {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/stats', { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (stats)');
  }
  return res.json();
}

export async function createProduct(data) {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (create product)');
  }
  return res.json();
}

export async function updateProduct(id, data) {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/products', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (update product)');
  }
  return res.json();
}

export async function deleteProduct(id) {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/products', {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (delete product)');
  }
  return res.json();
}

export async function updateStocks(updates) {
  const headers = await getAdminHeaders();
  const res = await fetch('/api/admin/stocks', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (update stocks)');
  }
  return res.json();
}
