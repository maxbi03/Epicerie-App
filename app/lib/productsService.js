export async function fetchProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (products)');
  }
  return res.json();
}