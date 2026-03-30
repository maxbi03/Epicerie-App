'use client';

import { useEffect, useState } from 'react';
import { fetchProducts } from '../../lib/productsService';
import { updateStocks } from '../../lib/adminService';
import { Minus, Plus } from 'lucide-react';

function getCategories(products) {
  const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  return ['Tous', ...cats];
}

export default function AdminStocks() {
  const [products, setProducts] = useState([]);
  const [modified, setModified] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function changeStock(id, newValue) {
    const val = Math.max(0, Number(newValue) || 0);
    setModified(prev => ({ ...prev, [id]: val }));
  }

  function increment(id, currentStock) {
    const current = modified[id] ?? currentStock;
    changeStock(id, current + 1);
  }

  function decrement(id, currentStock) {
    const current = modified[id] ?? currentStock;
    changeStock(id, current - 1);
  }

  async function handleSave() {
    const updates = Object.entries(modified).map(([id, stock_shelf]) => ({
      id: Number(id) || id,
      stock_shelf,
    }));

    if (updates.length === 0) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await updateStocks(updates);
      setMessage(`${updates.length} produit(s) mis à jour`);
      setModified({});
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'Tous' || p.category === activeCategory;
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const modifiedCount = Object.keys(modified).length;

  return (
    <div className="px-5 py-4">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Stocks</h2>
          <p className="text-sm text-text-secondary">Ajustement manuel</p>
        </div>
        {modifiedCount > 0 && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : `Enregistrer (${modifiedCount})`}
          </button>
        )}
      </div>

      {error && <div className="text-red-500 text-xs font-medium mb-3 p-3 bg-red-50 rounded-xl">{error}</div>}
      {message && <div className="text-green-600 text-xs font-medium mb-3 p-3 bg-green-50 rounded-xl">{message}</div>}

      <input
        type="text"
        placeholder="Rechercher..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white mb-3"
      />

      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
        {getCategories(products).map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all
              ${activeCategory === cat
                ? 'bg-primary text-white'
                : 'bg-card-bg text-text-secondary border border-border-light'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(product => {
            const currentStock = modified[product.id] ?? product.stock;
            const isModified = modified[product.id] != null;

            return (
              <div key={product.id} className={`flex items-center gap-3 bg-card-bg rounded-2xl p-3 border shadow-sm ${isModified ? 'border-primary' : 'border-border-light'}`}>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-text-primary truncate">{product.name}</h4>
                  <p className="text-[10px] text-text-muted">{product.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => decrement(product.id, product.stock)}
                    className="size-9 flex items-center justify-center rounded-xl bg-app-bg hover:bg-border-light transition-colors font-bold text-text-primary"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={e => changeStock(product.id, e.target.value)}
                    className={`w-14 text-center py-1.5 rounded-xl border text-sm font-bold ${isModified ? 'border-primary bg-primary/5 text-primary' : 'border-border-light text-text-primary'}`}
                  />
                  <button
                    onClick={() => increment(product.id, product.stock)}
                    className="size-9 flex items-center justify-center rounded-xl bg-app-bg hover:bg-border-light transition-colors font-bold text-text-primary"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
