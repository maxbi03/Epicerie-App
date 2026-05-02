'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Minus, Send, X, ChevronDown, ChevronUp, Check } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_META = {
  draft: { label: 'Brouillon', pill: 'bg-gray-100 text-gray-600' },
  sent:  { label: 'Envoyée',   pill: 'bg-blue-100 text-blue-700' },
  paid:  { label: 'Payée',     pill: 'bg-green-100 text-green-700' },
};

const EMPTY_LINE = { product_name: '', quantity: 1, price_unit: '' };

export default function FacturesPage() {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/producer/invoices').then(r => r.json()),
      fetch('/api/producer/products').then(r => r.json()),
    ]).then(([invs, prods]) => {
      setInvoices(Array.isArray(invs) ? invs : []);
      setProducts(Array.isArray(prods) ? prods : []);
    }).catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  function updateLine(i, field, value) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  function addLine() {
    setLines(prev => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(i) {
    setLines(prev => prev.filter((_, idx) => idx !== i));
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.price_unit) || 0), 0);

  async function handleSubmit() {
    const items = lines
      .filter(l => l.product_name && Number(l.quantity) > 0 && Number(l.price_unit) > 0)
      .map(l => ({ product_name: l.product_name, quantity: Number(l.quantity), price_unit: Number(l.price_unit) }));
    if (items.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/producer/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, notes }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur');
      }
      const invoice = await res.json();
      setInvoices(prev => [invoice, ...prev]);
      setDone(true);
      setTimeout(() => setShowForm(false), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(id) {
    setSending(id);
    try {
      const res = await fetch('/api/producer/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'sent' }),
      });
      if (!res.ok) throw new Error('Erreur');
      const updated = await res.json();
      setInvoices(prev => prev.map(inv => inv.id === id ? updated : inv));
    } catch {
      setError('Impossible de marquer comme envoyée');
    } finally {
      setSending(null);
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
            <h2 className="text-xl font-bold text-text-primary">Factures</h2>
            <p className="text-sm text-text-muted">{invoices.length} facture{invoices.length > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setLines([{ ...EMPTY_LINE }]); setNotes(''); setDone(false); setError(''); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
          >
            <FileText size={14} /> Nouvelle facture
          </button>
        </div>
        {error && !showForm && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600">{error}</div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <FileText size={40} className="opacity-30" />
            <p className="text-sm font-bold">Aucune facture</p>
          </div>
        ) : invoices.map(inv => {
          const meta = STATUS_META[inv.status] || STATUS_META.draft;
          const items = Array.isArray(inv.items) ? inv.items : [];
          return (
            <div key={inv.id} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-black text-text-primary">{inv.invoice_number}</p>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.pill}`}>{meta.label}</span>
                  </div>
                  <p className="text-[10px] text-text-muted">{formatDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="font-black text-sm text-primary">{Number(inv.amount_chf).toFixed(2)} CHF</p>
                  {inv.status === 'draft' && (
                    <button
                      onClick={() => handleSend(inv.id)}
                      disabled={sending === inv.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 text-[10px] font-black active:scale-90 transition-all disabled:opacity-50"
                    >
                      {sending === inv.id ? '...' : <><Send size={10} /> Envoyer</>}
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                    className="size-8 flex items-center justify-center rounded-xl bg-app-bg text-text-muted"
                  >
                    {expanded === inv.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
              </div>
              {expanded === inv.id && (
                <div className="px-4 pb-4 border-t border-border-light pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-text-muted font-bold uppercase tracking-wider">
                        <th className="text-left pb-1">Article</th>
                        <th className="text-right pb-1">Qté</th>
                        <th className="text-right pb-1">P.U.</th>
                        <th className="text-right pb-1">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light">
                      {items.map((item, j) => (
                        <tr key={j}>
                          <td className="py-1 text-text-primary font-medium">{item.product_name}</td>
                          <td className="py-1 text-right text-text-secondary">{item.quantity}</td>
                          <td className="py-1 text-right text-text-secondary">{Number(item.price_unit).toFixed(2)}</td>
                          <td className="py-1 text-right font-bold text-text-primary">{(item.quantity * item.price_unit).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-black">
                        <td colSpan={3} className="pt-2 text-text-muted">Total</td>
                        <td className="pt-2 text-right text-primary">{Number(inv.amount_chf).toFixed(2)} CHF</td>
                      </tr>
                    </tfoot>
                  </table>
                  {inv.notes && <p className="text-xs text-text-muted mt-2 italic">{inv.notes}</p>}
                  {inv.sent_at && <p className="text-[10px] text-text-muted mt-1">Envoyée le {formatDate(inv.sent_at)}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modale nouvelle facture */}
      {showForm && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => !saving && setShowForm(false)}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border-light flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText size={16} className="text-primary" />
                </div>
                <h2 className="text-lg font-black text-text-primary">Nouvelle facture</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-app-bg text-text-secondary">
                <X size={18} />
              </button>
            </div>

            {error && <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="bg-app-bg rounded-2xl p-3 border border-border-light space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Ligne {i + 1}</p>
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="size-6 flex items-center justify-center rounded-lg bg-red-50 text-red-400">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Nom du produit"
                    value={line.product_name}
                    onChange={e => updateLine(i, 'product_name', e.target.value)}
                    list={`products-list-${i}`}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                  />
                  <datalist id={`products-list-${i}`}>
                    {products.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-text-muted block mb-1">Quantité</label>
                      <input
                        type="number" min="1" value={line.quantity}
                        onChange={e => updateLine(i, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-text-muted block mb-1">Prix unitaire CHF</label>
                      <input
                        type="number" step="0.01" min="0" value={line.price_unit}
                        onChange={e => updateLine(i, 'price_unit', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-border text-sm"
                      />
                    </div>
                  </div>
                  {line.product_name && Number(line.quantity) > 0 && Number(line.price_unit) > 0 && (
                    <p className="text-xs text-right font-bold text-primary">
                      = {(Number(line.quantity) * Number(line.price_unit)).toFixed(2)} CHF
                    </p>
                  )}
                </div>
              ))}

              <button
                onClick={addLine}
                className="w-full py-2.5 rounded-2xl border border-dashed border-border-light text-xs font-bold text-text-secondary flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <Plus size={14} /> Ajouter une ligne
              </button>

              <input
                type="text"
                placeholder="Remarques (optionnel)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border text-sm"
              />
            </div>

            <div className="shrink-0 px-5 pb-6 pt-3 border-t border-border-light">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-text-muted">Total</span>
                <span className="text-xl font-black text-primary">{total.toFixed(2)} CHF</span>
              </div>
              <button
                onClick={handleSubmit}
                disabled={total === 0 || saving || done}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${done ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}
              >
                {done ? <><Check size={16} /> Facture créée !</>
                  : saving ? 'Enregistrement...'
                  : <><FileText size={16} /> Créer la facture ({total.toFixed(2)} CHF)</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
