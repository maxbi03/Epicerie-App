'use client';

import { useEffect, useState } from 'react';
import { Package, Plus, Minus, Check } from 'lucide-react';
import { fetchAdminProducts } from '../../lib/adminService';

export default function AdminLivraisonsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qtys, setQtys] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminProducts()
      .then(data => setProducts(data.filter(p => p.is_active)))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setQty(id, value) {
    setQtys(prev => ({ ...prev, [id]: Math.max(0, parseInt(value, 10) || 0) }));
  }

  function adjust(id, delta) {
    setQtys(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }

  const total = Object.values(qtys).reduce((s, q) => s + (q || 0), 0);

  async function handleSubmit() {
    const items = Object.entries(qtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, qty }));
    if (items.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delivery', items }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      setDone(true);
      setQtys({});
      const data = await fetchAdminProducts();
      setProducts(data.filter(p => p.is_active));
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-4 pb-3 shrink-0 border-b border-border-light">
        <h2 className="text-xl font-bold text-text-primary">Livraison fournisseur</h2>
        <p className="text-sm text-text-muted mt-0.5">Saisir les quantités reçues — ajoutées au stock réserve</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {error && <p className="text-sm text-red-500 px-1">{error}</p>}
            {products.map(product => {
              const qty = qtys[product.id] ?? 0;
              const hasQty = qty > 0;
              return (
                <div key={product.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all ${hasQty ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-700' : 'bg-app-bg border-border-light'}`}>
                  <div className="size-10 rounded-xl overflow-hidden bg-white border border-gray-200 dark:border-white/10 shrink-0">
                    {product.image_url && <img src={product.image_url} className="w-full h-full object-contain" alt="" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{product.name}</p>
                    <p className="text-[10px] text-text-muted">Réserve : <span className="font-bold">{product.stock_back ?? 0}</span></p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => adjust(product.id, -1)} className={`size-8 flex items-center justify-center rounded-lg transition-all active:scale-90 ${hasQty ? 'bg-amber-200 dark:bg-amber-700 text-amber-700 dark:text-amber-200' : 'bg-gray-100 dark:bg-white/10 text-text-muted'}`}>
                      <Minus size={12} />
                    </button>
                    <input type="number" inputMode="numeric" min="0" value={qty || ''} placeholder="0"
                      onChange={e => setQty(product.id, e.target.value)}
                      className={`w-12 text-center text-sm font-black rounded-lg border py-1.5 transition-all outline-none dark:bg-white/5 dark:text-white ${hasQty ? 'border-amber-300 dark:border-amber-600 bg-white text-amber-700' : 'border-border dark:border-white/10'}`}
                    />
                    <button onClick={() => adjust(product.id, 1)} className={`size-8 flex items-center justify-center rounded-lg transition-all active:scale-90 ${hasQty ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-text-muted'}`}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border-light">
            {total > 0 && (
              <p className="text-center text-xs text-text-muted mb-3">
                <span className="font-black text-amber-600">{total} unité{total !== 1 ? 's' : ''}</span> à ajouter en réserve
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={total === 0 || saving || done}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
                done ? 'bg-green-500 text-white' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
              }`}
            >
              {done ? <><Check size={16} /> Stock mis à jour !</>
               : saving ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement...</>
               : <><Package size={16} /> Valider la livraison</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
