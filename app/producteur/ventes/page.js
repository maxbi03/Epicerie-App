'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProducerSalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('month');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch('/api/producer/sales')
      .then(r => r.ok ? r.json() : Promise.reject('Erreur'))
      .then(setSales)
      .catch(() => setError('Impossible de charger les ventes'))
      .finally(() => setLoading(false));
  }, []);

  function isInPeriod(dateStr) {
    if (period === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (period === 'today') return date.toDateString() === now.toDateString();
    if (period === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return date >= w; }
    if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return true;
  }

  const filtered = sales.filter(s => isInPeriod(s.created_at));
  const totalRevenue = filtered.reduce((s, sale) => s + (sale.amount || 0), 0);
  const totalQty = filtered.reduce((s, sale) => s + sale.items.reduce((a, i) => a + i.qty, 0), 0);

  // Stats par produit
  const byProduct = {};
  filtered.forEach(sale => {
    sale.items.forEach(item => {
      if (!byProduct[item.name]) byProduct[item.name] = { qty: 0, revenue: 0 };
      byProduct[item.name].qty += item.qty;
      byProduct[item.name].revenue += item.qty * Number(item.price_chf || 0);
    });
  });
  const topProducts = Object.entries(byProduct).sort((a, b) => b[1].qty - a[1].qty);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Mes ventes</h2>
        <p className="text-sm text-text-muted">Produits vendus à travers l'épicerie</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">{error}</div>}

      {/* Filtres */}
      <div className="flex gap-2">
        {[['today', "Auj."], ['week', '7j'], ['month', 'Mois'], ['all', 'Tout']].map(([key, label]) => (
          <button key={key} onClick={() => setPeriod(key)}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all ${period === key ? 'bg-primary text-white' : 'bg-card-bg text-text-secondary border border-border-light'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-primary">{filtered.length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tickets</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-text-primary">{totalQty}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Unités</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-xl font-bold text-green-600">{totalRevenue.toFixed(2)}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">CHF</p>
        </div>
      </div>

      {/* Top produits */}
      {topProducts.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Par produit</p>
          <div className="space-y-2">
            {topProducts.map(([name, stats]) => (
              <div key={name} className="flex items-center justify-between bg-card-bg rounded-2xl p-3 border border-border-light">
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-primary shrink-0" />
                  <span className="text-sm font-bold text-text-primary">{name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{stats.revenue.toFixed(2)} CHF</p>
                  <p className="text-[10px] text-text-muted">{stats.qty} unité{stats.qty > 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des ventes */}
      {filtered.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Détail des ventes</p>
          <div className="space-y-2">
            {filtered.map((sale, i) => (
              <div key={sale.id || i} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
                <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full flex items-center gap-3 p-3 text-left">
                  <ShoppingBag size={14} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-primary">{formatDate(sale.created_at)}</p>
                    <p className="text-[10px] text-text-muted">{sale.items.length} article{sale.items.length > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-green-600">{sale.amount.toFixed(2)} CHF</span>
                    {expanded === i ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
                  </div>
                </button>
                {expanded === i && (
                  <div className="px-4 pb-3 border-t border-border-light pt-2">
                    {sale.items.map((item, j) => (
                      <div key={j} className="flex justify-between text-xs py-0.5">
                        <span className="text-text-primary">{item.name} × {item.qty}</span>
                        <span className="font-bold text-text-secondary">{(item.qty * Number(item.price_chf)).toFixed(2)} CHF</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
          <ShoppingBag size={40} className="opacity-30" />
          <p className="text-sm font-bold">Aucune vente sur cette période</p>
        </div>
      )}
    </div>
  );
}
