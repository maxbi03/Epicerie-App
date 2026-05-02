'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Plus, X, Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_META = {
  pending:  { label: 'En attente', pill: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approuvée',  pill: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusée',    pill: 'bg-red-100 text-red-600' },
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PropositionsPage() {
  const [proposals, setProposals] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('new_product');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/producer/proposals').then(r => r.json()),
      fetch('/api/producer/products').then(r => r.json()),
    ]).then(([props, prods]) => {
      setProposals(Array.isArray(props) ? props : []);
      setProducts(Array.isArray(prods) ? prods : []);
    }).catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  function openForm(t) {
    setType(t);
    setForm({});
    setDone(false);
    setError('');
    setShowForm(true);
  }

  function field(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = {
        type,
        product_id: type === 'price_change' ? form.product_id : undefined,
        data: form,
      };
      const res = await fetch('/api/producer/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      const proposal = await res.json();
      setProposals(prev => [proposal, ...prev]);
      setDone(true);
      setTimeout(() => setShowForm(false), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const pendingCount = proposals.filter(p => p.status === 'pending').length;

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="px-5 pt-4 shrink-0">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Propositions</h2>
            <p className="text-sm text-text-muted">{pendingCount > 0 ? `${pendingCount} en attente de validation` : 'Soumettre une demande à l\'admin'}</p>
          </div>
        </div>

        {error && !showForm && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">{error}</div>}

        {/* Deux types de propositions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => openForm('new_product')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border-light bg-card-bg active:scale-[0.97] transition-all"
          >
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus size={18} className="text-primary" />
            </div>
            <p className="text-xs font-bold text-text-primary text-center">Proposer un<br/>nouveau produit</p>
          </button>
          <button
            onClick={() => openForm('price_change')}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border-light bg-card-bg active:scale-[0.97] transition-all"
          >
            <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Lightbulb size={18} className="text-amber-600" />
            </div>
            <p className="text-xs font-bold text-text-primary text-center">Modifier un<br/>prix existant</p>
          </button>
        </div>
      </div>

      {/* Liste des propositions */}
      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
        {proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-muted">
            <Lightbulb size={40} className="opacity-30" />
            <p className="text-sm font-bold">Aucune proposition envoyée</p>
          </div>
        ) : proposals.map(p => {
          const meta = STATUS_META[p.status] || STATUS_META.pending;
          const typeLabel = p.type === 'new_product' ? 'Nouveau produit' : 'Changement de prix';
          return (
            <div key={p.id} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
              <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="w-full flex items-center gap-3 p-3 text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-text-primary truncate">{p.data?.name || p.data?.product_name || typeLabel}</p>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.pill}`}>{meta.label}</span>
                  </div>
                  <p className="text-[10px] text-text-muted">{typeLabel} · {formatDate(p.created_at)}</p>
                </div>
                {expanded === p.id ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
              </button>
              {expanded === p.id && (
                <div className="px-4 pb-3 border-t border-border-light pt-2 space-y-1">
                  {Object.entries(p.data || {}).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs">
                      <span className="text-text-muted capitalize w-28 shrink-0">{k.replace(/_/g, ' ')}</span>
                      <span className="text-text-primary font-medium">{String(v)}</span>
                    </div>
                  ))}
                  {p.admin_note && (
                    <div className="mt-2 pt-2 border-t border-border-light">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Note de l'admin</p>
                      <p className="text-xs text-text-secondary italic">{p.admin_note}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modale formulaire */}
      {showForm && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => !saving && setShowForm(false)}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border-light flex items-center justify-between">
              <h2 className="text-lg font-black text-text-primary">
                {type === 'new_product' ? 'Proposer un nouveau produit' : 'Demander un changement de prix'}
              </h2>
              <button onClick={() => setShowForm(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-app-bg text-text-secondary">
                <X size={18} />
              </button>
            </div>

            {error && <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {type === 'new_product' ? (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Nom du produit *</label>
                    <input required type="text" value={form.name || ''} onChange={e => field('name', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Prix proposé CHF *</label>
                      <input required type="number" step="0.05" min="0" value={form.price || ''} onChange={e => field('price', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Quantité / Poids</label>
                      <input type="text" placeholder="ex: 500g" value={form.quantity || ''} onChange={e => field('quantity', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Catégorie</label>
                    <input type="text" placeholder="ex: Fromages, Légumes…" value={form.category || ''} onChange={e => field('category', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Description</label>
                    <textarea rows={3} value={form.description || ''} onChange={e => field('description', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Disponibilité / Saisonnalité</label>
                    <input type="text" placeholder="ex: Toute l'année, Été seulement…" value={form.availability || ''} onChange={e => field('availability', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Produit concerné *</label>
                    <select required value={form.product_id || ''} onChange={e => { field('product_id', e.target.value); const p = products.find(x => String(x.id) === e.target.value); if (p) field('product_name', p.name); }}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm">
                      <option value="">— Sélectionner —</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (actuel: {Number(p.price_chf).toFixed(2)} CHF)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Nouveau prix CHF *</label>
                    <input required type="number" step="0.05" min="0" value={form.new_price || ''} onChange={e => field('new_price', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Motif</label>
                    <textarea rows={2} placeholder="Hausse des matières premières, nouvelle recette…" value={form.reason || ''} onChange={e => field('reason', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Date souhaitée</label>
                    <input type="date" value={form.effective_date || ''} onChange={e => field('effective_date', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border text-sm" />
                  </div>
                </>
              )}

              <button type="submit" disabled={saving || done}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${done ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>
                {done ? <><Check size={16} /> Proposition envoyée !</>
                  : saving ? 'Envoi...'
                  : 'Envoyer la proposition'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
