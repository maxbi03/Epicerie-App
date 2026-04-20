'use client';

import { fetchProducts } from '../lib/productsService';
import { useState, useEffect } from 'react';
import ProductModal from '../components/ProductModal';

function getCategories(products) {
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  return ['Tous', ...cats];
}

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
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      <main className="relative flex h-full max-w-md mx-auto flex-col overflow-hidden">
        <div className="px-5 pt-4 shrink-0">

          {/*}
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Stocks</h1>
            </div>
            <span className="text-[9px] bg-card-bg border border-border-light px-2 py-1 rounded-lg font-black text-text-muted uppercase tracking-widest shadow-sm">
              Màj : En direct
            </span>
          </div>
            */}

          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white mb-4"
          />

          <div className="flex gap-2 overflow-x-auto pb-0 mb-4">
            {getCategories(products).map(cat => (
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
                  onClick={() => setSelectedProduct(product)}
                  className="w-full flex items-center gap-4 bg-card-bg rounded-2xl p-4 border border-border-light shadow-sm active:scale-[0.98] transition-all text-left"
                >
                  <div className="size-14 rounded-2xl overflow-hidden bg-white border border-gray-200 dark:border-white/10 shrink-0">
                    {product.image && <img src={product.image} className="w-full h-full object-contain" alt={product.name} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-text-primary truncate">{product.name}</h4>
                    </div>
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

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}
