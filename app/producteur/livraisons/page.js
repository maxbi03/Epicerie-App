'use client';

import { useEffect, useState } from 'react';
import { Truck, Plus, Minus, Check, X, ChevronDown, ChevronUp, Package } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_META = {
  pending:   { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', pill: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmée',  color: 'text-green-600', bg: 'bg-green-50', pill: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',    color: 'text-gray-400',  bg: 'bg-gray-50',  pill: 'bg-gray-100 text-gray-500' },
};

export default function LivraisonsPage() {
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [qtys, setQtys] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/producer/products').then(r => r.json()),
      fetch('/api/producer/deliveries').then(r => r.json()),
    ]).then(([prods, dels]) => {
      setProducts(Array.isArray(prods) ? prods.filter(p => p.is_active) : []);
      setDeliveries(Array.isArray(dels) ? dels : []);
    }).catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  function openForm() {
    setQtys({});
    setNotes('');
    setDone(false);
    setError('');
    setShowForm(true);
  }

  function adjust(id, delta) {
    setQtys(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }

  const total = Object.values(qtys).reduce((s, q) => s + q, 0);

  async function handleSubmit() {
    const items = Object.entries(qtys)
      .filter(([, qty]) => qty > 0)
      .map(([product_id, quantity]) => {
        const p = products.find(x => String(x.id) === product_id);
        return { product_id, product_name: p?.name || '', quantity };
      });
    if (items.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/producer/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      const delivery = await res.json();
      setDeliveries(prev => [delivery, ...prev]);
      setDone(true);
      setTimeout(() => setShowForm(false), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="px-5 pt-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Livraisons</h2>
            <p className="text-sm text-text-muted">{deliveries.length} livraison{deliveries.length > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openForm}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
          >
            <Truck size={14} /> Nouvelle livraison
          </button>
        </div>
        {error && !showForm && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">{error}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
        {deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <Package size={40} className="opacity-30" />
            <p className="text-sm font-bold">Aucune livraison enregistrée</p>
          </div>
        ) : deliveries.map(d => {
          const meta = STATUS_META[d.status] || STATUS_META.pending;
          const items = Array.isArray(d.items) ? d.items : [];
          return (
            <div key={d.id} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Truck size={15} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary">{formatDate(d.created_at)}</p>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.pill}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-text-muted">{items.reduce((s, i) => s + Number(i.quantity || 0), 0)} u.</span>
                  {expanded === d.id ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
                </div>
              </button>
              {expanded === d.id && (
                <div className="px-4 pb-4 border-t border-border-light pt-3">
                  <ul className="space-y-1.5">
                    {items.map((item, j) => (
                      <li key={j} className="flex items-center justify-between text-xs">
                        <span className="text-text-primary font-medium">{item.product_name || item.product_id}</span>
                        <span className="font-bold text-primary">{item.quantity} u.</span>
                      </li>
                    ))}
                  </ul>
                  {d.notes && <p className="text-xs text-text-muted mt-2 italic">{d.notes}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modale nouvelle livraison */}
      {showForm && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => !saving && setShowForm(false)}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Truck size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-black text-text-primary">Déclarer une livraison</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-app-bg text-text-secondary">
                <X size={18} />
              </button>
            </div>
            <p className="px-5 pt-3 text-xs text-text-muted">Les quantités saisies seront ajoutées au stock réserve de l'épicerie.</p>

            {error && <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {products.map(p => {
                const qty = qtys[p.id] ?? 0;
                const hasQty = qty > 0;
                return (
                  <div key={p.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all ${hasQty ? 'bg-primary/5 border-primary/30' : 'bg-app-bg border-border-light'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{p.name}</p>
                      <p className="text-[10px] text-text-muted">Stock actuel: R:{p.stock_shelf ?? 0} S:{p.stock_back ?? 0}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => adjust(p.id, -1)} className={`size-8 flex items-center justify-center rounded-lg active:scale-90 ${hasQty ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-text-muted'}`}>
                        <Minus size={12} />
                      </button>
                      <input
                        type="number" inputMode="numeric" min="0"
                        value={qty || ''}
                        placeholder="0"
                        onChange={e => setQtys(prev => ({ ...prev, [p.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className={`w-12 text-center text-sm font-black rounded-lg border py-1.5 outline-none ${hasQty ? 'border-primary/30 bg-white text-primary' : 'border-border'}`}
                      />
                      <button onClick={() => adjust(p.id, 1)} className={`size-8 flex items-center justify-center rounded-lg active:scale-90 ${hasQty ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'}`}>
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="shrink-0 px-5 pb-6 pt-3 border-t border-border-light space-y-3">
              <input
                type="text"
                placeholder="Note (optionnel)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm"
              />
              <button
                onClick={handleSubmit}
                disabled={total === 0 || saving || done}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${done ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}
              >
                {done ? <><Check size={16} /> Livraison enregistrée !</>
                  : saving ? 'Enregistrement...'
                  : <><Truck size={16} /> Confirmer ({total} unité{total > 1 ? 's' : ''})</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
