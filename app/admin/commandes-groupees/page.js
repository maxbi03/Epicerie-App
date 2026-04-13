'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Minus, ChevronDown, ChevronUp,
  Mail, Phone, CalendarDays, Clock, Truck, Link2,
} from 'lucide-react';

// ── Paliers de remise ──
function getDiscountRate(subtotalCHF) {
  if (subtotalCHF >= 600) return 12;
  if (subtotalCHF >= 350) return 8;
  if (subtotalCHF >= 200) return 5;
  return 0;
}
function nextThreshold(subtotalCHF) {
  if (subtotalCHF < 200) return { amount: 200 - subtotalCHF, rate: 5 };
  if (subtotalCHF < 350) return { amount: 350 - subtotalCHF, rate: 8 };
  if (subtotalCHF < 600) return { amount: 600 - subtotalCHF, rate: 12 };
  return null;
}

// ── Statuts ──
const STATUS = {
  pending:   { label: 'En attente',    bg: 'bg-amber-100',  text: 'text-amber-700' },
  confirmed: { label: 'Lien envoyé',   bg: 'bg-blue-100',   text: 'text-blue-700'  },
  paid:      { label: 'Payée',         bg: 'bg-green-100',  text: 'text-green-700' },
  delivered: { label: 'Livrée',        bg: 'bg-gray-100',   text: 'text-gray-600'  },
  cancelled: { label: 'Annulée',       bg: 'bg-red-100',    text: 'text-red-600'   },
};

const FILTERS = [
  { key: 'all',       label: 'Toutes'       },
  { key: 'pending',   label: 'En attente'   },
  { key: 'confirmed', label: 'Lien envoyé'  },
  { key: 'paid',      label: 'Payées'       },
  { key: 'delivered', label: 'Livrées'      },
];

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export default function CommandesGroupeesPage() {
  // ── Liste ──
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  // ── Confirmation inline ──
  const [confirmingId, setConfirmingId] = useState(null);
  const [stripeLink,   setStripeLink]   = useState('');
  const [adminNotes,   setAdminNotes]   = useState('');
  const [patching,     setPatching]     = useState(false);

  // ── Modal nouvelle commande ──
  const [showModal,       setShowModal]       = useState(false);
  const [products,        setProducts]        = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [qty,             setQty]             = useState({});

  // Form
  const [cName,  setCName]  = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cDesc,  setCDesc]  = useState('');
  const [cDate,  setCDate]  = useState('');
  const [formErr, setFormErr] = useState('');
  const [formOk,  setFormOk]  = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch orders ──
  const fetchOrders = useCallback(() => {
    setLoading(true);
    const url = filter === 'all'
      ? '/api/admin/bulk-orders'
      : `/api/admin/bulk-orders?status=${filter}`;
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Fetch products (une seule fois) ──
  function fetchProducts() {
    if (products.length > 0) return;
    setProductsLoading(true);
    fetch('/api/products')
      .then(r => r.ok ? r.json() : [])
      .then(setProducts)
      .finally(() => setProductsLoading(false));
  }

  // ── Ouvrir modal ──
  function openModal() {
    setShowModal(true);
    setQty({});
    setCName(''); setCEmail(''); setCPhone(''); setCDesc(''); setCDate('');
    setFormErr(''); setFormOk(false);
    fetchProducts();
  }

  // ── Quantité produit ──
  function adjust(productId, delta) {
    setQty(prev => {
      const next = Math.max(0, (prev[productId] || 0) + delta);
      if (next === 0) { const { [productId]: _, ...rest } = prev; return rest; }
      return { ...prev, [productId]: next };
    });
  }

  // ── Calcul totaux ──
  const subtotalCHF = products.reduce((s, p) => s + (qty[p.id] || 0) * Number(p.price), 0);
  const discountRate = getDiscountRate(subtotalCHF);
  const totalCHF = subtotalCHF * (1 - discountRate / 100);
  const next = nextThreshold(subtotalCHF);

  // ── Soumettre la commande ──
  async function handleCreate() {
    if (!cName.trim())    { setFormErr('Le nom du contact est requis.'); return; }
    const items = products
      .filter(p => (qty[p.id] || 0) > 0)
      .map(p => ({ id: p.id, name: p.name, qty: qty[p.id], price: Number(p.price) }));
    if (items.length === 0)  { setFormErr('Ajoutez au moins un produit.'); return; }
    if (subtotalCHF < 200)   { setFormErr('Minimum 200 CHF pour une grosse commande.'); return; }

    setSubmitting(true); setFormErr('');
    try {
      const res = await fetch('/api/admin/bulk-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: cName.trim(),
          contact_email: cEmail.trim() || null,
          contact_phone: cPhone.trim() || null,
          event_description: cDesc.trim() || null,
          event_date: cDate || null,
          items,
          subtotal: Math.round(subtotalCHF * 100),
          discount_rate: discountRate,
          total: Math.round(totalCHF * 100),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      setFormOk(true);
      setTimeout(() => { setShowModal(false); fetchOrders(); }, 1400);
    } catch (e) {
      setFormErr(e.message || 'Erreur, réessayez.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Patch statut ──
  async function patch(id, updates) {
    setPatching(true);
    try {
      await fetch('/api/admin/bulk-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      setConfirmingId(null); setStripeLink(''); setAdminNotes('');
      fetchOrders();
    } finally { setPatching(false); }
  }

  async function remove(id) {
    if (!confirm('Supprimer définitivement cette commande ?')) return;
    await fetch('/api/admin/bulk-orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchOrders();
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="px-5 py-5 pb-24 space-y-4">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-text-primary flex items-center gap-2">
            Commandes groupées
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Événements · Entreprises · Associations</p>
        </div>
        <button onClick={openModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-black active:scale-95 transition-all shadow-md shadow-primary/20">
          <Plus size={14} /> Nouvelle
        </button>
      </div>

      {/* ── Paliers info ── */}
      <div className="bg-primary-light rounded-2xl px-4 py-3">
        <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-2">Paliers de remise</p>
        <div className="flex flex-wrap gap-2">
          {[['200–349 CHF', '5%'], ['350–599 CHF', '8%'], ['600+ CHF', '12%']].map(([range, pct]) => (
            <span key={range} className="px-2.5 py-1 bg-white/70 rounded-lg text-xs font-bold text-text-secondary">
              {range} <span className="text-primary">→ -{pct}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-5 px-5">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all
              ${filter === f.key
                ? 'bg-primary text-white'
                : 'bg-card-bg text-text-secondary border border-border-light'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center text-text-muted text-sm py-12">Aucune commande</p>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const st = STATUS[order.status] || STATUS.pending;
            const sub   = order.subtotal / 100;
            const total = order.total    / 100;
            const isExp = expandedId === order.id;
            const isCfm = confirmingId === order.id;

            return (
              <div key={order.id} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">

                {/* ── Résumé (cliquable) ── */}
                <button onClick={() => setExpandedId(isExp ? null : order.id)}
                  className="w-full px-5 py-4 flex items-start gap-3 text-left active:bg-app-bg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-text-primary">{order.contact_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                    {order.event_description && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{order.event_description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs font-bold text-text-primary">{total.toFixed(2)} CHF</span>
                      {order.discount_rate > 0 && (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-lg">
                          -{order.discount_rate}% (économie {(sub - total).toFixed(2)} CHF)
                        </span>
                      )}
                      {order.event_date && (
                        <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                          <CalendarDays size={10} /> {fmtDate(order.event_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExp
                    ? <ChevronUp   size={16} className="text-text-muted shrink-0 mt-1" />
                    : <ChevronDown size={16} className="text-text-muted shrink-0 mt-1" />}
                </button>

                {/* ── Détail ── */}
                {isExp && (
                  <div className="border-t border-border-light px-5 py-4 space-y-4">

                    {/* Contact */}
                    <div className="space-y-1.5">
                      {order.contact_email && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Mail size={12} className="shrink-0 text-text-muted" />
                          {order.contact_email}
                        </div>
                      )}
                      {order.contact_phone && (
                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                          <Phone size={12} className="shrink-0 text-text-muted" />
                          {order.contact_phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Clock size={12} className="shrink-0" />
                        Soumise le {fmtDate(order.created_at)}
                      </div>
                    </div>

                    {/* Articles */}
                    <div>
                      <p className="text-xs font-black text-text-primary mb-2">Articles commandés</p>
                      <div className="space-y-1">
                        {(order.items || []).map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-text-secondary">
                            <span>{item.qty}× {item.name}</span>
                            <span className="font-bold">{(item.qty * item.price).toFixed(2)} CHF</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-dashed border-border mt-2 pt-2 space-y-1">
                        <div className="flex justify-between text-xs text-text-muted">
                          <span>Sous-total</span><span>{sub.toFixed(2)} CHF</span>
                        </div>
                        {order.discount_rate > 0 && (
                          <div className="flex justify-between text-xs text-green-600 font-bold">
                            <span>Remise {order.discount_rate}%</span>
                            <span>-{(sub - total).toFixed(2)} CHF</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-black text-text-primary pt-0.5">
                          <span>Total client</span><span>{total.toFixed(2)} CHF</span>
                        </div>
                      </div>
                    </div>

                    {/* Note admin */}
                    {order.admin_notes && (
                      <div className="bg-app-bg rounded-xl p-3 text-xs">
                        <p className="font-bold text-text-secondary mb-0.5">Note</p>
                        <p className="text-text-muted">{order.admin_notes}</p>
                      </div>
                    )}

                    {/* Lien Stripe existant */}
                    {order.stripe_payment_link && (
                      <div className="bg-blue-50 rounded-xl p-3 text-xs space-y-1">
                        <p className="font-bold text-blue-700 flex items-center gap-1">
                          <Link2 size={11} /> Lien de paiement envoyé
                        </p>
                        <a href={order.stripe_payment_link} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 underline break-all">
                          {order.stripe_payment_link}
                        </a>
                      </div>
                    )}

                    {/* ── Actions ── */}
                    <div className="space-y-2">

                      {/* Pending → confirmer + saisir lien Stripe */}
                      {order.status === 'pending' && !isCfm && (
                        <button onClick={() => setConfirmingId(order.id)}
                          className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-black active:scale-95 transition-all">
                          Confirmer & envoyer lien Stripe
                        </button>
                      )}

                      {order.status === 'pending' && isCfm && (
                        <div className="space-y-2">
                          <input
                            value={stripeLink}
                            onChange={e => setStripeLink(e.target.value)}
                            placeholder="https://buy.stripe.com/..."
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-bg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <textarea
                            value={adminNotes}
                            onChange={e => setAdminNotes(e.target.value)}
                            placeholder="Note interne (optionnel)…"
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input-bg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setConfirmingId(null)}
                              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold text-text-secondary">
                              Annuler
                            </button>
                            <button
                              disabled={!stripeLink.trim() || patching}
                              onClick={() => patch(order.id, {
                                status: 'confirmed',
                                stripe_payment_link: stripeLink.trim(),
                                admin_notes: adminNotes.trim() || null,
                              })}
                              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-black disabled:opacity-40 active:scale-95 transition-all">
                              {patching ? 'Envoi…' : 'Confirmer'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Confirmed → payée */}
                      {order.status === 'confirmed' && (
                        <button
                          disabled={patching}
                          onClick={() => patch(order.id, { status: 'paid' })}
                          className="w-full py-2.5 rounded-xl bg-green-500 text-white text-xs font-black active:scale-95 transition-all">
                          ✓ Marquer comme payée
                        </button>
                      )}

                      {/* Paid → livrée */}
                      {order.status === 'paid' && (
                        <button
                          disabled={patching}
                          onClick={() => patch(order.id, { status: 'delivered' })}
                          className="w-full py-2.5 rounded-xl bg-forest-green text-white text-xs font-black active:scale-95 transition-all flex items-center justify-center gap-1.5">
                          <Truck size={13} /> Marquer comme livrée
                        </button>
                      )}

                      {/* Annuler (pending ou confirmed) */}
                      {['pending', 'confirmed'].includes(order.status) && (
                        <button
                          disabled={patching}
                          onClick={() => patch(order.id, { status: 'cancelled' })}
                          className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-xs font-bold active:scale-95 transition-all">
                          Annuler la commande
                        </button>
                      )}

                      {/* Supprimer (livrée ou annulée) */}
                      {['delivered', 'cancelled'].includes(order.status) && (
                        <button onClick={() => remove(order.id)}
                          className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-xs font-bold active:scale-95 transition-all">
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          Modal — Nouvelle commande
      ══════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="flex-1" onClick={() => setShowModal(false)} />

          <div className="bg-app-bg rounded-t-3xl max-h-[92vh] flex flex-col animate-slide-up">

            {/* Header modal */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
              <div>
                <h2 className="text-lg font-black text-text-primary">Nouvelle commande groupée</h2>
                {discountRate > 0 ? (
                  <p className="text-xs text-green-600 font-bold mt-0.5">
                    Remise {discountRate}% — Total : <span className="text-base">{totalCHF.toFixed(2)} CHF</span>
                  </p>
                ) : subtotalCHF > 0 && next ? (
                  <p className="text-xs text-text-muted mt-0.5">
                    +{next.amount.toFixed(2)} CHF pour -{next.rate}%
                  </p>
                ) : (
                  <p className="text-xs text-text-muted mt-0.5">Minimum 200 CHF</p>
                )}
              </div>
              <button onClick={() => setShowModal(false)}
                className="size-8 rounded-full bg-card-bg flex items-center justify-center shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-5">

              {/* Contact */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider">Contact</p>
                <input value={cName} onChange={e => setCName(e.target.value)}
                  placeholder="Nom du contact *"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex gap-2">
                  <input value={cEmail} onChange={e => setCEmail(e.target.value)}
                    placeholder="Email" type="email"
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-input-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={cPhone} onChange={e => setCPhone(e.target.value)}
                    placeholder="Téléphone" type="tel"
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-input-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <input value={cDesc} onChange={e => setCDesc(e.target.value)}
                  placeholder="Description (ex : Apéro entreprise, 30 pers.)"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <div className="flex items-center gap-3">
                  <label className="text-xs text-text-muted shrink-0 flex items-center gap-1">
                    <CalendarDays size={13} /> Date événement
                  </label>
                  <input value={cDate} onChange={e => setCDate(e.target.value)}
                    type="date"
                    className="flex-1 px-4 py-3 rounded-xl border border-border bg-input-bg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>

              {/* Produits */}
              <div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-3">Produits</p>
                {productsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {products.map(p => {
                      const q = qty[p.id] || 0;
                      return (
                        <div key={p.id}
                          className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all
                            ${q > 0
                              ? 'bg-primary-light border-primary/30'
                              : 'bg-card-bg border-border-light'}`}>
                          {p.image && (
                            <img src={p.image} alt={p.name}
                              className="size-10 rounded-xl object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text-primary truncate">{p.name}</p>
                            <p className="text-xs text-text-muted">{Number(p.price).toFixed(2)} CHF</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => adjust(p.id, -1)}
                              className="size-7 rounded-full bg-white border border-border flex items-center justify-center active:scale-90 transition-all">
                              <Minus size={12} />
                            </button>
                            <span className="w-5 text-center text-sm font-black text-text-primary">{q}</span>
                            <button onClick={() => adjust(p.id, 1)}
                              className="size-7 rounded-full bg-primary text-white flex items-center justify-center active:scale-90 transition-all">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer modal */}
            <div className="px-5 pt-3 pb-5 border-t border-border-light shrink-0 space-y-3">
              {/* Récapitulatif */}
              {subtotalCHF > 0 && (
                <div className="bg-card-bg rounded-xl px-4 py-3 space-y-1">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Sous-total</span><span>{subtotalCHF.toFixed(2)} CHF</span>
                  </div>
                  {discountRate > 0 ? (
                    <>
                      <div className="flex justify-between text-xs text-green-600 font-bold">
                        <span>Remise {discountRate}%</span>
                        <span>-{(subtotalCHF - totalCHF).toFixed(2)} CHF</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-text-primary border-t border-border pt-1 mt-1">
                        <span>Total client</span><span>{totalCHF.toFixed(2)} CHF</span>
                      </div>
                    </>
                  ) : next ? (
                    <p className="text-[10px] text-amber-600 font-bold">
                      Encore {next.amount.toFixed(2)} CHF → -{next.rate}% de remise
                    </p>
                  ) : null}
                </div>
              )}

              {formErr && <p className="text-xs text-red-500 font-bold">{formErr}</p>}

              {formOk ? (
                <div className="w-full py-3.5 rounded-xl bg-green-500 text-white text-sm font-black text-center">
                  ✓ Commande créée !
                </div>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={submitting || subtotalCHF < 200}
                  className="w-full py-3.5 rounded-xl bg-primary text-white text-sm font-black disabled:opacity-40 active:scale-95 transition-all shadow-md shadow-primary/20">
                  {submitting
                    ? 'Création…'
                    : subtotalCHF >= 200
                      ? `Créer la commande — ${totalCHF.toFixed(2)} CHF`
                      : `Minimum 200 CHF (${subtotalCHF.toFixed(2)} CHF actuellement)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
