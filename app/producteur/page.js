'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Package, TrendingDown } from 'lucide-react';

const LOW_THRESHOLD = 5;

export default function ProducerDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/producer/products')
      .then(r => r.ok ? r.json() : Promise.reject('Erreur'))
      .then(setProducts)
      .catch(() => setError('Impossible de charger vos produits'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const urgent = products.filter(p => p.is_active && (p.stock_shelf ?? 0) === 0 && (p.stock_back ?? 0) === 0);
  const low = products.filter(p => p.is_active && !urgent.find(u => u.id === p.id) && ((p.stock_shelf ?? 0) <= LOW_THRESHOLD || (p.stock_back ?? 0) <= LOW_THRESHOLD));
  const ok = products.filter(p => p.is_active && !urgent.find(u => u.id === p.id) && !low.find(l => l.id === p.id));
  const inactive = products.filter(p => !p.is_active);

  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Tableau de bord</h2>
        <p className="text-sm text-text-muted">{products.length} produit{products.length > 1 ? 's' : ''} enregistré{products.length > 1 ? 's' : ''}</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">{error}</div>
      )}

      {/* Alertes */}
      {urgent.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-sm font-black text-red-700">Rupture totale — livraison urgente</p>
          </div>
          <div className="space-y-2">
            {urgent.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-red-100">
                <span className="text-sm font-bold text-text-primary truncate">{p.name}</span>
                <span className="text-xs font-bold text-red-500 shrink-0 ml-2">0 / 0</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {low.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} className="text-amber-600" />
            <p className="text-sm font-black text-amber-700">Stock faible — à réapprovisionner bientôt</p>
          </div>
          <div className="space-y-2">
            {low.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-amber-100">
                <span className="text-sm font-bold text-text-primary truncate">{p.name}</span>
                <span className="text-xs font-bold text-amber-600 shrink-0 ml-2">
                  R:{p.stock_shelf ?? 0} / S:{p.stock_back ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tous les produits */}
      <div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Tous vos produits</p>
        {products.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Package size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">Aucun produit associé à votre compte</p>
            <p className="text-xs mt-1">Contactez Épico pour lier vos produits</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map(p => {
              const shelf = p.stock_shelf ?? 0;
              const back = p.stock_back ?? 0;
              const isOut = p.is_active && shelf === 0 && back === 0;
              const isLow = p.is_active && !isOut && (shelf <= LOW_THRESHOLD || back <= LOW_THRESHOLD);
              return (
                <div key={p.id} className={`flex items-center gap-3 rounded-2xl p-3 border ${
                  !p.is_active ? 'bg-gray-50 border-gray-200 opacity-60'
                  : isOut ? 'bg-red-50/50 border-red-200'
                  : isLow ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-card-bg border-border-light'
                }`}>
                  <div className="size-10 rounded-xl overflow-hidden bg-white border border-gray-100 shrink-0">
                    {p.image_url && <img src={p.image_url} className="w-full h-full object-contain" alt="" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{p.name}</p>
                    <p className="text-[10px] text-text-muted">{p.category} · {Number(p.price_chf || 0).toFixed(2)} CHF</p>
                  </div>
                  <div className="text-right shrink-0">
                    {p.is_active ? (
                      <>
                        <p className={`text-xs font-bold ${shelf === 0 ? 'text-red-500' : shelf <= LOW_THRESHOLD ? 'text-amber-500' : 'text-green-600'}`}>
                          Rayon: {shelf}
                        </p>
                        <p className={`text-xs font-bold ${back === 0 ? 'text-red-500' : back <= LOW_THRESHOLD ? 'text-amber-500' : 'text-green-600'}`}>
                          Stock: {back}
                        </p>
                      </>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Inactif</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
