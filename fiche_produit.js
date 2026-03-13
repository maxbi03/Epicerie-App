// fiche_produit.js - Templates de fiches produit par famille

/**
 * Génère le contenu HTML de la fiche produit selon sa catégorie
 * @param {Object} product - Objet produit depuis shop.js
 * @returns {string} HTML de la fiche produit
*/

window.showProductModal = showProductModal;
window.closeProductModal = closeProductModal;
window.increaseQuantity = increaseQuantity;
window.decreaseQuantity = decreaseQuantity;
window.addProductToBasket = addProductToBasket;
window.productQuantity = productQuantity = 1;

let currentProduct = null; // ← variable globale pour stocker le produit actuellement affiché dans le modal



function showProductModal(name) {
      const modal = document.getElementById('product-modal');
      const panel = document.getElementById('modal-panel');
      const content = document.getElementById('modal-content');
      currentProduct = window.products.find(p => p.name === name);
      content.innerHTML = generateProductSheet(currentProduct);
      // 1. Afficher le modal
        modal.classList.remove('hidden');

        // 2. Attendre que le navigateur rende, puis animer
         requestAnimationFrame(() => {
         panel.classList.remove('translate-y-full');
         panel.classList.add('translate-y-0');
  });
}

function closeProductModal() {
      const modal = document.getElementById('product-modal');
      const panel = document.getElementById('modal-panel');

      productQuantity = 1;
      const qtyEl = document.getElementById('product-quantity');
      if (qtyEl) qtyEl.textContent = '1';

      // 1. Animer vers le bas
        panel.classList.remove('translate-y-0');
        panel.classList.add('translate-y-full');

        // 2. Cacher après l'animation
        setTimeout(() => {
        modal.classList.add('hidden');
        productQuantity = 1;
        const qtyEl = document.getElementById('product-quantity');
        if (qtyEl) qtyEl.textContent = '1';
        }, 300); // même durée que duration-300
}

function increaseQuantity() {
      productQuantity++;
      document.getElementById('product-quantity').textContent = productQuantity;
    }

function decreaseQuantity() {
      if (productQuantity > 1) {
        productQuantity--;
        document.getElementById('product-quantity').textContent = productQuantity;
      }
}

function addProductToBasket() {
      if (!currentProduct) return;

      let basket = JSON.parse(localStorage.getItem('user_basket') || "[]");
      for (let i = 0; i < productQuantity; i++) basket.push(currentProduct);
      localStorage.setItem('user_basket', JSON.stringify(basket));

      if (navigator.vibrate) navigator.vibrate([50, 100, 50]);

      closeProductModal();
      showConfirmation();
      updateCartDisplay();
}

function showConfirmation() {
      const confirmMsg = document.createElement('div');
      confirmMsg.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-forest-green font-bold px-6 py-3 rounded-full shadow-lg z-[300] flex items-center gap-2';
      confirmMsg.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        <span>Ajouté au panier !</span>
      `;
      document.body.appendChild(confirmMsg);
      setTimeout(() => confirmMsg.remove(), 2000);
}

function updateCartDisplay() {
      const basket = JSON.parse(localStorage.getItem('user_basket') || "[]");
      const cartItemCount = document.getElementById('cart-item-count');
      const cartTotal = document.getElementById('cart-total');

      let total = 0;
      basket.forEach(p => { total += Number(p.price) || 0; });

      if (cartItemCount) cartItemCount.textContent = basket.length;
      if (cartTotal) cartTotal.textContent = `${total.toFixed(2)} CHF`;
}

function generateProductSheet(product) {
    const category = product.category.toLowerCase();

    // Déterminer quelle template utiliser
    if (category.includes('crème') || category.includes('lait') || category.includes('fromage')) {
        return generateDairySheet(product);
    } else if (category.includes('boulang') || category.includes('pain')) {
        return generateBakerySheet(product);
    } else if (category.includes('frais') || category.includes('œuf') || category.includes('légume')) {
        return generateFreshSheet(product);
    } else if (category.includes('viande') || category.includes('charcuterie')) {
        return generateMeatSheet(product);
    } else if (category.includes('fruit')) {
        return generateFruitSheet(product);
    } else {
        return generateDefaultSheet(product);
    }
}

/**
 * Template pour CRÈMERIE / PRODUITS LAITIERS / FROMAGES
 */
function generateDairySheet(product) {
    return `
        <!-- Image principale -->
        <div class="relative h-64 bg-cover bg-center" style="background-image: url('${product.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div class="absolute top-4 right-4">
                <div class="bg-primary px-3 py-1 rounded-full">
                    <span class="text-xs font-black text-forest-green">🧀 FROMAGE</span>
                </div>
            </div>
        </div>

        <!-- Titre & Prix -->
        <div class="px-4 pt-6">
            <h1 class="text-2xl font-black text-forest-green dark:text-white leading-tight">${product.name}</h1>
            <p class="text-3xl font-black text-primary mt-2">${product.price} CHF <span class="text-sm font-medium text-gray-500">/ ${product.unit}</span></p>
        </div>

        <!-- Badges -->
        <div class="flex gap-2 px-4 mt-4 flex-wrap">
            ${generateBadges(product)}
        </div>

        <!-- Origine / Producteur -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Producteur</h3>
            <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <span class="material-symbols-outlined text-primary text-2xl">location_on</span>
                <div>
                    <p class="font-bold text-forest-green dark:text-white">${product.origin}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Producteur laitier local</p>
                </div>
            </div>
        </div>

        <!-- Informations nutritionnelles -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Valeurs nutritionnelles</h3>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">water_drop</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Matières grasses</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">~30g/100g</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">fitness_center</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Protéines</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">~25g/100g</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">bone</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Calcium</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">Riche</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">local_fire_department</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Calories</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">~400 kcal</p>
                </div>
            </div>
            <div class="mt-4 bg-primary/10 dark:bg-primary/5 p-3 rounded-xl border border-primary/20">
                <p class="text-xs text-gray-600 dark:text-gray-400 italic">
                    <span class="material-symbols-outlined text-primary text-sm align-middle">info</span>
                    Produit au lait de vache, affiné selon la tradition suisse. Contient du lactose.
                </p>
            </div>
        </div>

        <!-- Conservation -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Conservation</h3>
            <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary">ac_unit</span>
                    <div>
                        <p class="font-bold text-forest-green dark:text-white">À conserver entre 4°C et 8°C</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Consommer dans les 7 jours après ouverture.</p>
                    </div>
                </div>
            </div>
        </div>

        ${generateStockSection(product)}
    `;
}

/**
 * Template pour BOULANGERIE / PAIN
 */
function generateBakerySheet(product) {
    return `
        <!-- Image principale -->
        <div class="relative h-64 bg-cover bg-center" style="background-image: url('${product.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div class="absolute top-4 right-4">
                <div class="bg-primary px-3 py-1 rounded-full">
                    <span class="text-xs font-black text-forest-green">🥖 BOULANGERIE</span>
                </div>
            </div>
        </div>

        <!-- Titre & Prix -->
        <div class="px-4 pt-6">
            <h1 class="text-2xl font-black text-forest-green dark:text-white leading-tight">${product.name}</h1>
            <p class="text-3xl font-black text-primary mt-2">${product.price} CHF <span class="text-sm font-medium text-gray-500">/ ${product.unit}</span></p>
        </div>

        <!-- Badges -->
        <div class="flex gap-2 px-4 mt-4 flex-wrap">
            ${generateBadges(product)}
        </div>

        <!-- Origine / Artisan -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Artisan boulanger</h3>
            <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <span class="material-symbols-outlined text-primary text-2xl">store</span>
                <div>
                    <p class="font-bold text-forest-green dark:text-white">${product.origin}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Fabrication artisanale</p>
                </div>
            </div>
        </div>

        <!-- Caractéristiques de fabrication -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Savoir-faire</h3>
            <div class="space-y-3">
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">bakery_dining</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Pétrissage artisanal</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Façonné à la main chaque matin</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">eco</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Farine locale bio</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Moulue sur meule de pierre</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">schedule</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Levain naturel</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Fermentation longue de 12h</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">local_fire_department</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Cuisson au feu de bois</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Four traditionnel à 250°C</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Ingrédients -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Ingrédients</h3>
            <div class="bg-primary/10 dark:bg-primary/5 p-4 rounded-xl border border-primary/20">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                    Farine de blé bio (origine Suisse), eau, levain naturel, sel de mer.
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
                    Contient du gluten. Sans additifs ni conservateurs.
                </p>
            </div>
        </div>

        ${generateStockSection(product)}
    `;
}

/**
 * Template pour FRAIS / ŒUFS / LÉGUMES
 */
function generateFreshSheet(product) {
    return `
        <!-- Image principale -->
        <div class="relative h-64 bg-cover bg-center" style="background-image: url('${product.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div class="absolute top-4 right-4">
                <div class="bg-primary px-3 py-1 rounded-full">
                    <span class="text-xs font-black text-forest-green">🥬 FRAIS</span>
                </div>
            </div>
        </div>

        <!-- Titre & Prix -->
        <div class="px-4 pt-6">
            <h1 class="text-2xl font-black text-forest-green dark:text-white leading-tight">${product.name}</h1>
            <p class="text-3xl font-black text-primary mt-2">${product.price} CHF <span class="text-sm font-medium text-gray-500">/ ${product.unit}</span></p>
        </div>

        <!-- Badges -->
        <div class="flex gap-2 px-4 mt-4 flex-wrap">
            ${generateBadges(product)}
        </div>

        <!-- Origine / Ferme -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Provenance</h3>
            <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <span class="material-symbols-outlined text-primary text-2xl">agriculture</span>
                <div>
                    <p class="font-bold text-forest-green dark:text-white">${product.origin}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Production locale et bio</p>
                </div>
            </div>
        </div>

        <!-- Fraîcheur -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Garantie fraîcheur</h3>
            <div class="bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-4 rounded-xl border border-primary/30">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary text-3xl">schedule</span>
                    <div>
                        <p class="font-black text-forest-green dark:text-white text-lg">Récolté il y a moins de 24h</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            Produit frais du jour, cueilli à maturité optimale pour vous garantir saveur et qualité nutritionnelle.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Mode de production -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Mode de production</h3>
            <div class="space-y-3">
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">sunny</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Élevage en plein air</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Les poules profitent de vastes parcours herbeux</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">grass</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Alimentation naturelle</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Grains bio sans OGM, complément végétal</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">health_and_safety</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Sans antibiotiques</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Élevage respectueux du bien-être animal</p>
                    </div>
                </div>
            </div>
        </div>

        ${generateStockSection(product)}
    `;
}

/**
 * Template pour VIANDE / CHARCUTERIE
 */
function generateMeatSheet(product) {
    return `
        <!-- Image principale -->
        <div class="relative h-64 bg-cover bg-center" style="background-image: url('${product.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div class="absolute top-4 right-4">
                <div class="bg-primary px-3 py-1 rounded-full">
                    <span class="text-xs font-black text-forest-green">🥩 BOUCHERIE</span>
                </div>
            </div>
        </div>

        <!-- Titre & Prix -->
        <div class="px-4 pt-6">
            <h1 class="text-2xl font-black text-forest-green dark:text-white leading-tight">${product.name}</h1>
            <p class="text-3xl font-black text-primary mt-2">${product.price} CHF <span class="text-sm font-medium text-gray-500">/ ${product.unit}</span></p>
        </div>

        <!-- Badges -->
        <div class="flex gap-2 px-4 mt-4 flex-wrap">
            ${generateBadges(product)}
        </div>

        <!-- Origine / Éleveur -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Éleveur partenaire</h3>
            <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <span class="material-symbols-outlined text-primary text-2xl">agriculture</span>
                <div>
                    <p class="font-bold text-forest-green dark:text-white">${product.origin}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Élevage traditionnel suisse</p>
                </div>
            </div>
        </div>

        <!-- Traçabilité -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Traçabilité & Qualité</h3>
            <div class="space-y-3">
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">verified</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Label Viande Suisse</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">100% suisse de la naissance à l'abattage</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">grass</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Pâturage extensif</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Élevé en plein air dans les alpages</p>
                    </div>
                </div>
                <div class="flex items-start gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <span class="material-symbols-outlined text-primary">cut</span>
                    <div class="flex-1">
                        <p class="font-bold text-forest-green dark:text-white text-sm">Découpe fraîche</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Préparé par notre boucher le jour même</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Conseils de préparation -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Conseils du boucher</h3>
            <div class="bg-primary/10 dark:bg-primary/5 p-4 rounded-xl border border-primary/20">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                    <span class="material-symbols-outlined text-primary text-sm align-middle">restaurant</span>
                    Sortir 30 min avant cuisson. Cuire à feu vif pour saisir, puis à température moyenne. Laisser reposer 5 min avant de servir.
                </p>
            </div>
        </div>

        ${generateStockSection(product)}
    `;
}

/**
 * Template pour FRUITS
 */
function generateFruitSheet(product) {
    return `
        <!-- Image principale -->
        <div class="relative h-64 bg-cover bg-center" style="background-image: url('${product.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div class="absolute top-4 right-4">
                <div class="bg-primary px-3 py-1 rounded-full">
                    <span class="text-xs font-black text-forest-green">🍎 FRUITS</span>
                </div>
            </div>
        </div>

        <!-- Titre & Prix -->
        <div class="px-4 pt-6">
            <h1 class="text-2xl font-black text-forest-green dark:text-white leading-tight">${product.name}</h1>
            <p class="text-3xl font-black text-primary mt-2">${product.price} CHF <span class="text-sm font-medium text-gray-500">/ ${product.unit}</span></p>
        </div>

        <!-- Badges -->
        <div class="flex gap-2 px-4 mt-4 flex-wrap">
            ${generateBadges(product)}
        </div>

        <!-- Origine / Verger -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Verger</h3>
            <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <span class="material-symbols-outlined text-primary text-2xl">park</span>
                <div>
                    <p class="font-bold text-forest-green dark:text-white">${product.origin}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Arboriculture locale</p>
                </div>
            </div>
        </div>

        <!-- Fraîcheur & Saison -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Fraîcheur</h3>
            <div class="bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/10 dark:to-primary/5 p-4 rounded-xl border border-primary/30">
                <div class="flex items-start gap-3">
                    <span class="material-symbols-outlined text-primary text-3xl">calendar_today</span>
                    <div>
                        <p class="font-black text-forest-green dark:text-white text-lg">De saison</p>
                        <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            Cueilli à maturité optimale, ces fruits gorgés de soleil vous offrent toutes leurs saveurs et nutriments.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bienfaits -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Bienfaits nutritionnels</h3>
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">nutrition</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Vitamines</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">C, A, B</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">spa</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Fibres</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">Riche</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">shield</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Antioxydants</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">++</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="material-symbols-outlined text-primary text-sm">water_drop</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">Hydratation</span>
                    </div>
                    <p class="font-black text-forest-green dark:text-white">85%</p>
                </div>
            </div>
        </div>

        ${generateStockSection(product)}
    `;
}

/**
 * Template par DÉFAUT (pour autres catégories)
 */
function generateDefaultSheet(product) {
    return `
        <!-- Image principale -->
        <div class="relative h-64 bg-cover bg-center" style="background-image: url('${product.image}')">
            <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        <!-- Titre & Prix -->
        <div class="px-4 pt-6">
            <h1 class="text-2xl font-black text-forest-green dark:text-white leading-tight">${product.name}</h1>
            <p class="text-3xl font-black text-primary mt-2">${product.price} CHF <span class="text-sm font-medium text-gray-500">/ ${product.unit}</span></p>
        </div>

        <!-- Badges -->
        <div class="flex gap-2 px-4 mt-4 flex-wrap">
            ${generateBadges(product)}
        </div>

        <!-- Origine -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Origine</h3>
            <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <span class="material-symbols-outlined text-primary text-2xl">location_on</span>
                <span class="font-bold text-forest-green dark:text-white">${product.origin}</span>
            </div>
        </div>

        <!-- Description -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Description</h3>
            <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <p class="text-sm text-gray-600 dark:text-gray-400">
                    Produit de qualité, sélectionné avec soin pour notre épicerie.
                    Découvrez ${product.name} et profitez de sa fraîcheur garantie.
                </p>
            </div>
        </div>

        ${generateStockSection(product)}
    `;
}

/**
 * Génère les badges pour tous les templates
 */
function generateBadges(product) {
    let badges = '';

    // Badge catégorie
    badges += `
        <div class="flex items-center gap-2 px-3 py-2 bg-primary/20 dark:bg-primary/10 rounded-lg">
            <span class="material-symbols-outlined text-primary text-sm">category</span>
            <span class="text-xs font-bold text-forest-green dark:text-white">${product.category}</span>
        </div>
    `;

    // Badge spécial (Local, Bio, Frais...)
    if (product.badge) {
        const badgeIcon = getBadgeIcon(product.badge);
        badges += `
            <div class="flex items-center gap-2 px-3 py-2 bg-primary/20 dark:bg-primary/10 rounded-lg">
                <span class="material-symbols-outlined text-primary text-sm">${badgeIcon}</span>
                <span class="text-xs font-bold text-forest-green dark:text-white">${product.badge}</span>
            </div>
        `;
    }

    return badges;
}

/**
 * Icône selon le badge
 */
function getBadgeIcon(badge) {
    const icons = {
        'Local': 'home',
        'Bio': 'eco',
        'Frais': 'schedule',
        'Artisanal': 'handyman',
        'AOP': 'verified',
        'IGP': 'workspace_premium'
    };
    return icons[badge] || 'label';
}

/**
 * Génère la section stock (commune à tous les templates)
 */
function generateStockSection(product) {
    return `
        <!-- Stock disponible -->
        <div class="px-4 mt-6">
            <h3 class="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Disponibilité</h3>
            <div class="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                <span class="material-symbols-outlined text-primary text-2xl">inventory_2</span>
                <div>
                    <span class="font-black text-forest-green dark:text-white text-lg">${product.stock} en stock</span>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${getStockMessage(product.stock)}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Message de stock
 */
function getStockMessage(stock) {
    if (stock <= 2) return "🔴 Dernières pièces disponibles !";
    if (stock <= 5) return "🟠 Stock limité";
    return "🟢 Bien approvisionné";
}
