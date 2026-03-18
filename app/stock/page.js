'use client';

import { fetchProducts } from '../lib/productsService';
import { useState, useEffect } from 'react';

const CATEGORIES = ['Tous', 'Crèmerie', 'Boulangerie', 'Boissons', 'Epicerie', 'Fruits & Légumes'];

function StockBadge({ stock }) {
  if (stock === 0) return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-red-50 text-red-500 border border-red-100">Rupture</span>
  );
  if (stock <= 5) return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-50 text-amber-500 border border-amber-100">Stock faible · {stock}</span>
  );
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-green-50 text-green-600 border border-green-100">En stock · {stock}</span>
  );
}

export default function StockPage() {
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(data => {
        setProducts(data);
        localStorage.setItem('products_cache', JSON.stringify(data));
      })
      .catch(err => console.error('Erreur produits:', err))
      .finally(() => setLoadingProducts(false));
  }, []);

  const filtered = products.filter(p => {
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
    window.dispatchEvent(new Event('cart-updated'));
    closeModal();
  }

  return (
    <>
      <main className="relative flex min-h-screen max-w-md mx-auto flex-col">
        <div className="flex-1 px-5 pt-4 pb-24">

          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Stocks</h1>
              <p className="text-sm text-text-secondary">Disponibilité en temps réel</p>
            </div>
            <span className="text-[9px] bg-card-bg border border-border-light px-2 py-1 rounded-lg font-black text-text-muted uppercase tracking-widest shadow-sm">
              Màj : En direct
            </span>
          </div>

          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white mb-4"
          />

          <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all
                  ${activeCategory === cat
                    ? 'bg-primary text-white'
                    : 'bg-card-bg text-text-secondary border border-border-light'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {loadingProducts ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-text-muted text-xs py-10">Aucun produit trouvé</p>
            ) : (
              filtered.map(product => (
                <button
                  key={product.id}
                  onClick={() => openModal(product)}
                  className="w-full flex items-center gap-4 bg-card-bg rounded-2xl p-4 border border-border-light shadow-sm active:scale-[0.98] transition-all text-left"
                >
                  <div className="size-14 rounded-2xl overflow-hidden bg-app-bg shrink-0">
                    {product.image && <img src={product.image} className="w-full h-full object-cover" alt={product.name} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-text-primary truncate">{product.name}</h4>
                    <p className="text-[10px] text-text-muted mt-0.5">{product.origin}</p>
                    <div className="mt-1.5">
                      <StockBadge stock={product.stock} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-sm text-text-primary">{product.price.toFixed(2)}</span>
                    <span className="text-[10px] text-text-muted block">CHF</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={closeModal}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card-bg/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">Détails du produit</h2>
              <button onClick={closeModal} className="size-10 flex items-center justify-center rounded-full hover:bg-app-bg transition-colors text-text-secondary">✕</button>
            </div>
            <div className="p-5">
              <div className="w-full h-48 rounded-2xl overflow-hidden bg-app-bg mb-4">
                {selectedProduct.image && <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />}
              </div>
              <h3 className="text-xl font-bold text-text-primary">{selectedProduct.name}</h3>
              <p className="text-sm text-text-secondary mt-1">{selectedProduct.origin}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-2xl font-black text-text-primary">{selectedProduct.price.toFixed(2)} CHF</span>
                <StockBadge stock={selectedProduct.stock} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-card-bg p-4 border-t border-border-light">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="size-10 flex items-center justify-center rounded-full bg-app-bg hover:bg-border-light transition-colors font-bold text-text-primary">−</button>
                  <span className="text-lg font-bold text-text-primary">{quantity}</span>
                  <button onClick={() => setQuantity(q => q + 1)} className="size-10 flex items-center justify-center rounded-full bg-app-bg hover:bg-border-light transition-colors font-bold text-text-primary">+</button>
                </div>
                <button
                  onClick={addToBasket}
                  disabled={selectedProduct.stock === 0}
                  className="w-[70%] bg-primary text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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