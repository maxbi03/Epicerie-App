'use client';

import { useState } from 'react';

const CATEGORIES = ['Tous', 'Crèmerie', 'Boulangerie', 'Boissons', 'Epicerie', 'Fruits & Légumes'];

const MOCK_PRODUCTS = [
  { id: 1, name: 'Lait entier bio', category: 'Crèmerie', price: 1.90, stock: 12, origin: 'Ferme locale', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=100' },
  { id: 2, name: 'Pain de campagne', category: 'Boulangerie', price: 3.50, stock: 4, origin: 'Boulangerie du village', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=100' },
  { id: 3, name: 'Jus de pomme', category: 'Boissons', price: 2.80, stock: 0, origin: 'Verger Fribourgeois', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=100' },
  { id: 4, name: 'Pâtes artisanales', category: 'Epicerie', price: 2.20, stock: 8, origin: 'Italie', image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=100' },
  { id: 5, name: 'Fraises de pays', category: 'Fruits & Légumes', price: 4.50, stock: 6, origin: 'Semsales', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=100' },
  { id: 6, name: 'Yogourt nature', category: 'Crèmerie', price: 1.20, stock: 15, origin: 'Ferme de l\'Ours', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=100' },
];

function StockBadge({ stock }) {
  if (stock === 0) return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-red-50 text-red-500 border border-red-100">
      Rupture
    </span>
  );
  if (stock <= 5) return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-50 text-amber-500 border border-amber-100">
      Stock faible · {stock}
    </span>
  );
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-green-50 text-green-600 border border-green-100">
      En stock · {stock}
    </span>
  );
}

export default function StockPage() {
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const filtered = MOCK_PRODUCTS.filter(p => {
    const matchCat = activeCategory === 'Tous' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  function openModal(product) {
    setSelectedProduct(product);
    setQuantity(1);
  }

  function closeModal() {
    setSelectedProduct(null);
  }

  function addToBasket() {
    if (!selectedProduct) return;
    const basket = JSON.parse(localStorage.getItem('user_basket') || '[]');
    for (let i = 0; i < quantity; i++) basket.push(selectedProduct);
    localStorage.setItem('user_basket', JSON.stringify(basket));
    closeModal();
    alert(`${quantity}x ${selectedProduct.name} ajouté au panier !`);
  }

  return (
    <>
      <main className="relative flex min-h-screen max-w-md mx-auto flex-col">
        <div className="flex-1 px-5 pt-4 pb-24">

          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-bold text-green-900 dark:text-white">Stocks</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Disponibilité en temps réel</p>
            </div>
            <span className="text-[9px] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 px-2 py-1 rounded-lg font-black text-gray-400 uppercase tracking-widest shadow-sm">
              Màj : En direct
            </span>
          </div>

          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white mb-4"
          />

          <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all
                  ${activeCategory === cat
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-white/5 text-gray-500 border border-gray-100 dark:border-white/5'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-10">Aucun produit trouvé</p>
            ) : (
              filtered.map(product => (
                <button
                  key={product.id}
                  onClick={() => openModal(product)}
                  className="w-full flex items-center gap-4 bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all text-left"
                >
                  <div className="size-14 rounded-2xl overflow-hidden bg-gray-50 shrink-0">
                    <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-green-900 dark:text-gray-200 truncate">{product.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">{product.origin}</p>
                    <div className="mt-1.5">
                      <StockBadge stock={product.stock} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-sm text-green-900 dark:text-white">{product.price.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-400 block">CHF</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {selectedProduct && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
              <h2 className="text-lg font-bold text-green-900 dark:text-white">Détails du produit</h2>
              <button onClick={closeModal} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-600">
                ✕
              </button>
            </div>

            <div className="p-5">
              <div className="w-full h-48 rounded-2xl overflow-hidden bg-gray-50 mb-4">
                <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
              </div>
              <h3 className="text-xl font-bold text-green-900 dark:text-white">{selectedProduct.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedProduct.origin}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-2xl font-black text-green-900 dark:text-white">{selectedProduct.price.toFixed(2)} CHF</span>
                <StockBadge stock={selectedProduct.stock} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-gray-900 p-4 border-t border-gray-100 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors font-bold text-green-900">
                    −
                  </button>
                  <span className="text-lg font-bold text-green-900 dark:text-white">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors font-bold text-green-900">
                    +
                  </button>
                </div>
                <button
                  onClick={addToBasket}
                  disabled={selectedProduct.stock === 0}
                  className="w-[70%] bg-green-600 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🛒 Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}