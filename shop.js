// shop.js - Catalogue & affichage des stocks
// IMPORTANT: le catalogue vient désormais de Supabase et est injecté dans window.products
// (voir services/productsService.js utilisé par stock.html et scanner.html).

// Valeur par défaut (évite des erreurs si Supabase n'a pas encore chargé)
window.products = window.products || [];

/**
 * Affiche la liste des produits dans la page stock.html
 * @param {string} filterCategory
 */
// Rendu pur — reçoit une liste et l'affiche

// État des filtres
let currentCategory = 'Tous';
let currentSearch = '';

function applyFilters() {
  const all = Array.isArray(window.products) ? window.products : [];

  const filtered = all.filter(p => {
    // Filtre catégorie
    const matchCategory = currentCategory === 'Tous' || p.category === currentCategory;
    
    // Filtre recherche
    const query = currentSearch.toLowerCase();
    const matchSearch = query === '' ||
      (p.name     || '').toLowerCase().includes(query) ||
      (p.origin   || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query);

    return matchCategory && matchSearch; // les deux doivent matcher
  });

  renderProducts(filtered);
}


function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<p class="text-center text-gray-400 text-xs py-10">Aucun produit à afficher.</p>`;
    return;
  }

  grid.innerHTML = list.map(product => {
    const stock = Number(product.stock ?? 0);
    let stockColor = 'text-leaf-green dark:text-primary';
    let stockLabel = 'En stock';
    if (stock <= 0)      { stockColor = 'text-gray-400';   stockLabel = 'Rupture'; }
    else if (stock <= 2) { stockColor = 'text-red-500';    stockLabel = 'Dernier !'; }
    else if (stock <= 5) { stockColor = 'text-orange-500'; stockLabel = 'Faible'; }

    const image = product.image || 'https://thumbs.dreamstime.com/b/no-image-available-icon-flat-vector-no-image-available-icon-flat-vector-illustration-132482953.jpg';

    return `
      <button type="button" onclick="showProductModal(${JSON.stringify(product.name).replace(/"/g,'&quot;')})"
        class="w-full text-left bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center justify-between shadow-sm transition-all active:scale-[0.98] appearance-none">
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
      </button>
    `;
  }).join('');
}

// Filtre par catégorie + met à jour les boutons
function displayProducts(filterCategory = 'Tous') {
  // Mettre à jour l'état
  currentCategory = filterCategory;

  // Boutons actifs
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.className = 'filter-btn px-4 py-2 bg-white dark:bg-white/5 text-gray-500 text-xs font-bold rounded-xl whitespace-nowrap border border-gray-100 dark:border-white/5 shrink-0';
  });
  const activeBtn = document.querySelector(`.filter-btn[data-category="${filterCategory}"]`);
  if (activeBtn) {
    activeBtn.className = 'filter-btn px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl whitespace-nowrap shrink-0';
  }

  applyFilters(); // ← applique les deux filtres combinés
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

  document.getElementById('search-input').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  
  const filtered = window.products.filter(p =>
    (p.name || '').toLowerCase().includes(query) ||
    (p.origin || '').toLowerCase().includes(query) ||
    (p.category || '').toLowerCase().includes(query)
  );

  renderProducts(filtered);
});

document.getElementById('search-input').addEventListener('input', (e) => {
  const query = e.target.value.trim();

  // Première lettre tapée → reset catégorie sur Tous
  if (query.length === 1 && currentSearch === '') {
    displayProducts('Tous'); // remet le bouton Tous actif
  }

  currentSearch = query;
  applyFilters();
});


// Scroll horizontal pour les catégories filtrantes

const slider = document.querySelector('.menu-scroll');
let isDown = false;
let startX;
let scrollLeft;

slider.addEventListener('mousedown', (e) => {
  isDown = true;
  startX = e.pageX - slider.offsetLeft;
  scrollLeft = slider.scrollLeft;
});

slider.addEventListener('mouseleave', () => isDown = false);
slider.addEventListener('mouseup', () => isDown = false);

slider.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - slider.offsetLeft;
  const walk = x - startX;
  slider.scrollLeft = scrollLeft - walk;
});

document.getElementById('product-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('product-modal')) {
    closeProductModal();
  }
});


  
});