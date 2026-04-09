const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function fetchAdminProducts() {
  const res = await fetch('/api/admin/products', { headers: JSON_HEADERS });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (admin products)');
  }
  return res.json();
}

export async function fetchAdminStats() {
  const res = await fetch('/api/admin/stats', { headers: JSON_HEADERS });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (stats)');
  }
  return res.json();
}

export async function createProduct(data) {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (create product)');
  }
  return res.json();
}

export async function updateProduct(id, data) {
  const res = await fetch('/api/admin/products', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (update product)');
  }
  return res.json();
}

export async function deleteProduct(id) {
  const res = await fetch('/api/admin/products', {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (delete product)');
  }
  return res.json();
}

export async function fetchAdminNews() {
  const res = await fetch('/api/admin/news', { headers: JSON_HEADERS });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (admin news)');
  }
  return res.json();
}

export async function createNews(data) {
  const res = await fetch('/api/admin/news', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (create news)');
  }
  return res.json();
}

export async function updateNews(id, data) {
  const res = await fetch('/api/admin/news', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (update news)');
  }
  return res.json();
}

export async function deleteNews(id) {
  const res = await fetch('/api/admin/news', {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (delete news)');
  }
  return res.json();
}

export async function updateStocks(updates) {
  const res = await fetch('/api/admin/stocks', {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (update stocks)');
  }
  return res.json();
}
