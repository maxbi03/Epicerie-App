// services/productsService.js
// Récupération du catalogue produits depuis Supabase (table: products)

import { supabase } from '../supabaseClient.js';

/**
 * Normalise un enregistrement Supabase en objet produit attendu par l'app.
 * Adapte ici les noms de colonnes si besoin.
 */
function normalizeProduct(row) {
  // Noms possibles côté Supabase (on tolère plusieurs variantes)
  const stock = row.stock ?? row.quantity ?? row.qty ?? 0;
  const barcode = row.barcode ?? row.ean ?? row.ean13 ?? row.code_barres ?? row.codebarres;

  return {
    id: row.id,
    name: row.name ?? row.title ?? row.nom ?? '',
    barcode: barcode == null ? null : String(barcode),
    price: Number(row.price ?? row.prix ?? 0),
    unit: row.unit ?? row.unite ?? '',
    origin: row.origin ?? row.producer ?? row.fournisseur ?? row.origine ?? '',
    image: row.image ?? row.image_url ?? row.photo ?? '',
    category: row.category ?? row.categorie ?? 'Divers',
    badge: row.badge ?? row.label ?? '',
    stock: Number(stock ?? 0)
  };
}

/**
 * Charge les produits depuis Supabase.
 * @returns {Promise<Array>} liste des produits normalisés
 */
export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Erreur Supabase (products)');
  }

  return (data || [])
    .map(normalizeProduct)
    .filter(p => p.id != null);
}