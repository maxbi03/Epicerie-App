'use client';

import { fetchProducts } from '../lib/productsService';
import { useState, useEffect } from 'react';
import { X, Minus, Plus, MapPin, Weight, FileText, Info, ShoppingCart } from 'lucide-react';

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
      <main className="relative flex h-screen max-w-md mx-auto flex-col overflow-hidden">
        <div className="px-5 pt-4 shrink-0">

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
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-24">
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
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/60 z-50 flex items-end justify-center"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fiche produit</h2>
              <button
                onClick={closeModal}
                className="size-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 transition-colors"
              ><X size={18} /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Image */}
              {selectedProduct.image && (
                <div className="w-full h-52 rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/5">
                  <img
                    src={selectedProduct.image}
                    className="w-full h-full object-cover"
                    alt={selectedProduct.name}
                  />
                </div>
              )}

              {/* Nom + badge */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {selectedProduct.name}
                  </h3>
                  {selectedProduct.badge && (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                      {selectedProduct.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedProduct.category}
                </p>
              </div>

              {/* Prix + Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prix unitaire</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white">
                    {selectedProduct.price.toFixed(2)} <span className="text-sm font-bold">CHF</span>
                  </p>
                  {selectedProduct.unit && (
                    <p className="text-xs text-gray-400">/ {selectedProduct.unit}</p>
                  )}
                </div>
                <div className={`rounded-2xl p-4 ${
                  selectedProduct.stock === 0 ? 'bg-red-50 dark:bg-red-900/20'
                  : selectedProduct.stock <= 5 ? 'bg-amber-50 dark:bg-amber-900/20'
                  : 'bg-green-50 dark:bg-green-900/20'
                }`}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Disponibilité</p>
                  {selectedProduct.stock === 0 ? (
                    <p className="text-lg font-black text-red-500">Rupture</p>
                  ) : selectedProduct.stock <= 5 ? (
                    <p className="text-lg font-black text-amber-500">{selectedProduct.stock} restant{selectedProduct.stock > 1 ? 's' : ''}</p>
                  ) : (
                    <p className="text-lg font-black text-green-600">En stock</p>
                  )}
                </div>
              </div>

              {/* Infos produit */}
              <div className="space-y-3">
                {(selectedProduct.origin || selectedProduct.quantity) && (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProduct.origin && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <MapPin size={20} className="text-gray-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Provenance</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedProduct.origin}</p>
                        </div>
                      </div>
                    )}
                    {selectedProduct.quantity && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                        <Weight size={20} className="text-gray-500 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Poids</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedProduct.quantity}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selectedProduct.description && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <FileText size={20} className="text-gray-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</p>
                      <p className="text-sm text-gray-800 dark:text-gray-200">{selectedProduct.description}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Note infos nutritionnelles */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  <Info size={14} className="inline mr-1" /> Les informations nutritionnelles détaillées seront disponibles prochainement.
                </p>
              </div>
            </div>

            {/* Footer — quantité + ajout panier */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-white/10 p-5">
              <div className="flex items-center justify-between gap-4">
                {/* Sélecteur quantité */}
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 rounded-2xl px-4 py-2">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="size-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-700 dark:text-white text-lg active:scale-90 transition-all"
                  ><Minus size={18} /></button>
                  <span className="text-lg font-black text-gray-900 dark:text-white min-w-[2ch] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(q => Math.min(q + 1, selectedProduct.stock))}
                    className="size-9 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 shadow-sm font-bold text-gray-700 dark:text-white text-lg active:scale-90 transition-all"
                  ><Plus size={18} /></button>
                </div>

                {/* Bouton ajouter */}
                <button
                  onClick={addToBasket}
                  disabled={selectedProduct.stock === 0}
                  className="flex-1 bg-primary text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart size={18} />
                  <span>
                    {selectedProduct.stock === 0
                      ? 'Indisponible'
                      : `Ajouter · ${(selectedProduct.price * quantity).toFixed(2)} CHF`
                    }
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}