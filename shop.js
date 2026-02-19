// shop.js - Gestion du catalogue produits

const products = [
    {
        id: 1,
        name: "Gruyère AOP Semsales",
        barcode: 2000000000000,
        price: 5.80,
        unit: "200g",
        origin: "Laiterie de Semsales",
        image: "https://images.unsplash.com/photo-1552767059-ce182ead6c1b?q=80&w=400&auto=format&fit=crop",
        category: "Crèmerie",
        badge: "Local",
        stock: 12
    },
    {
        id: 2,
        name: "Pain de Campagne",
        barcode: 2000000000001,
        price: 4.20,
        unit: "pce",
        origin: "Boulangerie du Village",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=400&auto=format&fit=crop",
        category: "Boulangerie",
        badge: "Frais",
        stock: 5
    },
    {
        id: 3,
        name: "Œufs de la Ferme",
        barcode: 2000000000002,
        price: 0.90,
        unit: "pce",
        origin: "Ferme des Biolles",
        image: "https://images.unsplash.com/photo-1582722653846-d0fa850027bb?q=80&w=400&auto=format&fit=crop",
        category: "Frais",
        badge: "Bio",
        stock: 24
    }
];

function displayProducts(filterCategory = 'Tous') {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = "";

    const filteredProducts = filterCategory === 'Tous'
    ? window.products
    : window.products.filter(p => p.category === filterCategory);

    filteredProducts.forEach(product => {
        // Déterminer la couleur du stock
        let stockColor = "text-leaf-green dark:text-primary";
        let stockLabel = "En stock";

        if (product.stock <= 2) {
            stockColor = "text-red-500";
            stockLabel = "Dernier !";
        } else if (product.stock <= 5) {
            stockColor = "text-orange-500";
            stockLabel = "Faible";
        }

        const productHTML = `
            <div class="bg-white dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center justify-between shadow-sm transition-all active:scale-[0.98]">
                <div class="flex items-center gap-4">
                    <div class="size-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/10 overflow-hidden">
                        <img src="${product.image}" class="w-full h-full object-cover">
                    </div>
                    <div>
                        <h4 class="font-bold text-sm text-forest-green dark:text-gray-200">${product.name}</h4>
                        <p class="text-[10px] text-gray-400 font-medium">${product.origin}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-sm font-black ${stockColor}">${product.stock}</span>
                    <p class="text-[8px] text-gray-400 uppercase font-black tracking-tighter">${stockLabel}</p>
                </div>
            </div>
        `;
        grid.innerHTML += productHTML;
    });
}

// Lancer l'affichage au chargement
document.addEventListener('DOMContentLoaded', displayProducts);

function addToCart(productId) {
    console.log("Ajout au panier du produit ID:", productId);
    // Logique pour ajouter au panier
}

// Fonction appelée après un scan réussi
function onScanSuccess(decodedText, decodedResult) {
    if (isScanning) return;
    isScanning = true;

    console.log("Code-barres scanné:", decodedText);

    const product = products.find(p => p.barcode == decodedText);

    if (product) {
        console.log("Produit trouvé:", product.name);

        // Vibration pour confirmer
        if (navigator.vibrate) navigator.vibrate(100);

        // Afficher la fiche produit
        currentProduct = product;
        showProductModal(product);

        // Débloquer après 3 secondes
        setTimeout(() => {
            isScanning = false;
        }, 3000);
    } else {
        console.warn("Code-barres non reconnu:", decodedText);
        alert("Produit non trouvé dans la base de données.");

        setTimeout(() => {
            isScanning = false;
        }, 500);
    }
}

// Afficher la fiche produit
function showProductModal(product) {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');

    // Générer le contenu de la fiche produit
    content.innerHTML = generateProductSheet(product);

    modal.classList.remove('hidden');

    setTimeout(() => {
        modal.querySelector('.absolute.inset-x-0').classList.add('translate-y-0');
    }, 10);
}

// Fermer la fiche produit
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.add('hidden');
    currentProduct = null;
}

// Ajouter au panier depuis le modal
function addProductToBasket() {
    if (!currentProduct) return;

    // Récupérer le panier existant
    let basket = JSON.parse(localStorage.getItem('user_basket') || "[]");

    // Ajouter le produit
    basket.push(currentProduct);

    // Sauvegarder
    localStorage.setItem('user_basket', JSON.stringify(basket));

    console.log("Produit ajouté au panier:", currentProduct.name);

    // Feedback visuel
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);

    // Fermer le modal
    closeProductModal();

    // Message de confirmation
    showConfirmation();
}

// Afficher une confirmation rapide
function showConfirmation() {
    const confirmMsg = document.createElement('div');
    confirmMsg.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-forest-green font-bold px-6 py-3 rounded-full shadow-lg z-[300] flex items-center gap-2';
    confirmMsg.innerHTML = `
        <span class="material-symbols-outlined">check_circle</span>
        <span>Ajouté au panier !</span>
    `;
    document.body.appendChild(confirmMsg);

    setTimeout(() => {
        confirmMsg.remove();
    }, 2000);
}