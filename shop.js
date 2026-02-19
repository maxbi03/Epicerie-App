// shop.js - Catalogue & affichage des stocks
// IMPORTANT: le catalogue vient désormais de Supabase et est injecté dans window.products
// (voir services/productsService.js utilisé par stock.html et scanner.html).

// Valeur par défaut (évite des erreurs si Supabase n'a pas encore chargé)
window.products = window.products || [];

/**
 * Affiche la liste des produits dans la page stock.html
 * @param {string} filterCategory
 */
function displayProducts(filterCategory = 'Tous') {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const all = Array.isArray(window.products) ? window.products : [];

  const filteredProducts = (filterCategory === 'Tous')
    ? all
    : all.filter(p => (p.category || '') === filterCategory);

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <p class="text-center text-gray-400 text-xs py-10">
        Aucun produit à afficher.
      </p>
    `;
    return;
  }

  grid.innerHTML = '';

  filteredProducts.forEach(product => {
    const stock = Number(product.stock ?? 0);

    // Couleur / libellé stock
    let stockColor = 'text-leaf-green dark:text-primary';
    let stockLabel = 'En stock';

    if (stock <= 0) {
      stockColor = 'text-gray-400';
      stockLabel = 'Rupture';
    } else if (stock <= 2) {
      stockColor = 'text-red-500';
      stockLabel = 'Dernier !';
    } else if (stock <= 5) {
      stockColor = 'text-orange-500';
      stockLabel = 'Faible';
    }

    const image = product.image || 'https://images.unsplash.com/photo-1587049352846-4a222e784b7e?q=80&w=200&auto=format&fit=crop';

    grid.innerHTML += `
      <div class="bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center justify-between shadow-sm transition-all active:scale-[0.98]">
        <div class="flex items-center gap-4">
          <div class="size-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/10 overflow-hidden">
            <img src="${image}" class="w-full h-full object-cover" alt="${(product.name || '').replace(/"/g,'&quot;')}">
          </div>
          <div>
            <h4 class="font-bold text-sm text-forest-green dark:text-gray-200">${product.name || ''}</h4>
            <p class="text-[10px] text-gray-400 font-medium">${product.origin || ''}</p>
          </div>
        </div>
        <div class="text-right">
          <span class="text-sm font-black ${stockColor}">${stock}</span>
          <p class="text-[8px] text-gray-400 uppercase font-black tracking-tighter">${stockLabel}</p>
        </div>
      </div>
    `;
  });
}

// Rendre la fonction accessible depuis les onclick="displayProducts('...')"
window.displayProducts = displayProducts;

// Affichage initial (par défaut) — IMPORTANT: ne pas passer l'event DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Sur stock.html, le module Supabase relancera displayProducts('Tous') après chargement.
  // Ici, on met juste un état initial propre.
  if (document.getElementById('products-grid')) {
    displayProducts('Tous');
  }
});