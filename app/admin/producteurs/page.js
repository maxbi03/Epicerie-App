'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, FileText, Check, X, Clock, ChevronDown, ChevronUp, Users, Phone, MapPin, Pencil, Eye, EyeOff } from 'lucide-react';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PROPOSAL_STATUS = {
  pending:  { label: 'En attente', pill: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approuvée',  pill: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusée',    pill: 'bg-red-100 text-red-600' },
};

const INVOICE_STATUS = {
  draft: { label: 'Brouillon', pill: 'bg-gray-100 text-gray-600' },
  sent:  { label: 'Reçue',     pill: 'bg-blue-100 text-blue-700' },
  paid:  { label: 'Payée',     pill: 'bg-green-100 text-green-700' },
};

const EMPTY_PRODUCER = { name: '', contact_name: '', email: '', phone: '', address: '', description: '' };

// ─── Vue Producteurs ──────────────────────────────────────────────────────────

function ProducersView() {
  const [producers, setProducers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  async function loadProducers() {
    try {
      const res = await fetch('/api/admin/producers');
      if (!res.ok) throw new Error('Erreur de chargement');
      setProducers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducers(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_PRODUCER);
    setShowForm(true);
    setError('');
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({ name: p.name || '', contact_name: p.contact_name || '', email: p.email || '', phone: p.phone || '', address: p.address || '', description: p.description || '' });
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/producers', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      setShowForm(false);
      await loadProducers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce producteur ?')) return;
    try {
      const res = await fetch('/api/admin/producers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error('Erreur suppression');
      setProducers(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleActive(p) {
    try {
      const res = await fetch('/api/admin/producers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, is_active: !p.is_active }) });
      if (!res.ok) throw new Error('Erreur');
      setProducers(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="px-5 pt-3 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-text-muted">{producers.length} producteur{producers.length !== 1 ? 's' : ''}</p>
          <button onClick={openCreate} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all">+ Ajouter</button>
        </div>
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError('')}><X size={14} className="text-red-400" /></button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : producers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <Users size={40} className="opacity-30" />
            <p className="text-sm font-bold">Aucun producteur</p>
          </div>
        ) : (
          <div className="space-y-2">
            {producers.map(p => (
              <div key={p.id} className={`rounded-2xl border overflow-hidden ${p.is_active ? 'bg-card-bg border-border-light' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                <div className="flex items-center gap-3 p-3">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-text-primary truncate">{p.name}</h4>
                    <p className="text-[10px] text-text-muted truncate">{p.email}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="size-9 flex items-center justify-center rounded-xl bg-app-bg text-text-muted active:scale-90 transition-all">
                      {expanded === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={() => handleToggleActive(p)} className={`size-9 flex items-center justify-center rounded-xl active:scale-90 transition-all ${p.is_active ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>
                      {p.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button onClick={() => openEdit(p)} className="size-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 active:scale-90 transition-all"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="size-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 active:scale-90 transition-all"><X size={16} /></button>
                  </div>
                </div>
                {expanded === p.id && (
                  <div className="px-4 pb-4 border-t border-border-light space-y-1.5 pt-3">
                    {p.contact_name && <div className="flex items-center gap-2 text-xs text-text-secondary"><Users size={12} className="text-text-muted" />{p.contact_name}</div>}
                    {p.phone && <div className="flex items-center gap-2 text-xs text-text-secondary"><Phone size={12} className="text-text-muted" />{p.phone}</div>}
                    {p.address && <div className="flex items-center gap-2 text-xs text-text-secondary"><MapPin size={12} className="text-text-muted" />{p.address}</div>}
                    {p.description && <p className="text-xs text-text-muted mt-1">{p.description}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card-bg/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">{editingId ? 'Modifier le producteur' : 'Nouveau producteur'}</h2>
              <button onClick={() => setShowForm(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-app-bg transition-colors text-text-secondary"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-xl">{error}</p>}
              {[
                { key: 'name', label: "Nom de l'exploitation *", required: true, placeholder: '' },
                { key: 'email', label: 'Email *', required: true, type: 'email', placeholder: '' },
                { key: 'contact_name', label: 'Contact', placeholder: 'Prénom Nom' },
                { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: '' },
                { key: 'address', label: 'Adresse', placeholder: 'Rue, NPA Localité' },
              ].map(({ key, label, required, type = 'text', placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">{label}</label>
                  <input required={required} type={type} placeholder={placeholder} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm resize-none" />
              </div>
              <button type="submit" disabled={saving} className="w-full bg-primary text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer le producteur'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vue Propositions & Factures ──────────────────────────────────────────────

function RequestsView() {
  const [view, setView] = useState('proposals');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [note, setNote] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetch('/api/admin/producer-requests?view=proposals')
      .then(r => r.ok ? r.json() : [])
      .then(data => setPendingCount(Array.isArray(data) ? data.filter(x => x.status === 'pending').length : 0))
      .catch(() => {});
  }, []);

  async function load(v = view) {
    setLoading(true);
    setExpanded(null);
    try {
      const res = await fetch(`/api/admin/producer-requests?view=${v}`);
      if (!res.ok) throw new Error('Erreur de chargement');
      setItems(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [view]);

  async function handleProposalAction(id, status) {
    if (status === 'rejected' && !noteModal) { setNoteModal(id); setNote(''); return; }
    setUpdating(id);
    try {
      const res = await fetch('/api/admin/producer-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'proposal', status, admin_note: note || undefined }),
      });
      if (!res.ok) throw new Error('Erreur');
      const updated = await res.json();
      setItems(prev => prev.map(x => x.id === id ? { ...x, ...updated } : x));
      setPendingCount(prev => Math.max(0, prev - 1));
      setNoteModal(null);
    } catch { setError('Erreur lors de la mise à jour'); }
    finally { setUpdating(null); }
  }

  async function handleInvoiceAction(id, status) {
    setUpdating(id);
    try {
      const res = await fetch('/api/admin/producer-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: 'invoice', status }),
      });
      if (!res.ok) throw new Error('Erreur');
      const updated = await res.json();
      setItems(prev => prev.map(x => x.id === id ? { ...x, ...updated } : x));
    } catch { setError('Erreur lors de la mise à jour'); }
    finally { setUpdating(null); }
  }

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="px-5 pt-3 shrink-0">
        {error && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-2">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={() => setError('')}><X size={14} className="text-red-400" /></button>
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setView('proposals')} className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${view === 'proposals' ? 'bg-primary text-white' : 'bg-card-bg text-text-secondary border border-border-light'}`}>
            <Lightbulb size={14} /> Propositions
            {pendingCount > 0 && view !== 'proposals' && (
              <span className="absolute -top-1 -right-1 size-4 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full">{pendingCount}</span>
            )}
          </button>
          <button onClick={() => setView('invoices')} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${view === 'invoices' ? 'bg-primary text-white' : 'bg-card-bg text-text-secondary border border-border-light'}`}>
            <FileText size={14} /> Factures
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <Lightbulb size={40} className="opacity-30" />
            <p className="text-sm font-bold">Aucun élément</p>
          </div>
        ) : view === 'proposals' ? (
          items.map(p => {
            const meta = PROPOSAL_STATUS[p.status] || PROPOSAL_STATUS.pending;
            const typeLabel = p.type === 'new_product' ? 'Nouveau produit' : 'Changement de prix';
            const isUpdating = updating === p.id;
            return (
              <div key={p.id} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
                <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="w-full flex items-center gap-3 p-4 text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-text-primary truncate">{p.data?.name || p.data?.product_name || typeLabel}</p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.pill}`}>{meta.label}</span>
                    </div>
                    <p className="text-[10px] text-text-muted">{p.producers?.name} · {typeLabel} · {formatDate(p.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {p.status === 'pending' && !isUpdating && (
                      <>
                        <button onClick={e => { e.stopPropagation(); handleProposalAction(p.id, 'approved'); }} className="size-9 flex items-center justify-center rounded-xl bg-green-50 text-green-600 active:scale-90 transition-all"><Check size={15} /></button>
                        <button onClick={e => { e.stopPropagation(); handleProposalAction(p.id, 'rejected'); }} className="size-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 active:scale-90 transition-all"><X size={15} /></button>
                      </>
                    )}
                    {isUpdating && <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    {expanded === p.id ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
                  </div>
                </button>
                {expanded === p.id && (
                  <div className="px-4 pb-4 border-t border-border-light pt-3 space-y-1">
                    {Object.entries(p.data || {}).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="text-text-muted capitalize w-32 shrink-0">{k.replace(/_/g, ' ')}</span>
                        <span className="text-text-primary font-medium">{String(v)}</span>
                      </div>
                    ))}
                    {p.admin_note && (
                      <div className="mt-2 pt-2 border-t border-border-light">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Note admin</p>
                        <p className="text-xs italic text-text-secondary">{p.admin_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          items.map(inv => {
            const meta = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft;
            const invItems = Array.isArray(inv.items) ? inv.items : [];
            const isUpdating = updating === inv.id;
            return (
              <div key={inv.id} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-bold text-text-primary">{inv.invoice_number}</p>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.pill}`}>{meta.label}</span>
                    </div>
                    <p className="text-[10px] text-text-muted">{inv.producers?.name} · {formatDate(inv.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="font-black text-sm text-primary">{Number(inv.amount_chf).toFixed(2)} CHF</p>
                    {inv.status === 'sent' && !isUpdating && (
                      <button onClick={() => handleInvoiceAction(inv.id, 'paid')} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-[10px] font-black active:scale-90 transition-all">
                        <Check size={11} /> Payer
                      </button>
                    )}
                    {isUpdating && <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    <button onClick={() => setExpanded(expanded === inv.id ? null : inv.id)} className="size-8 flex items-center justify-center rounded-xl bg-app-bg text-text-muted">
                      {expanded === inv.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>
                {expanded === inv.id && (
                  <div className="px-4 pb-4 border-t border-border-light pt-3">
                    <table className="w-full text-xs">
                      <thead><tr className="text-text-muted font-bold uppercase tracking-wider"><th className="text-left pb-1">Article</th><th className="text-right pb-1">Qté</th><th className="text-right pb-1">P.U.</th><th className="text-right pb-1">Total</th></tr></thead>
                      <tbody className="divide-y divide-border-light">
                        {invItems.map((item, j) => (
                          <tr key={j}>
                            <td className="py-1 text-text-primary font-medium">{item.product_name}</td>
                            <td className="py-1 text-right">{item.quantity}</td>
                            <td className="py-1 text-right">{Number(item.price_unit).toFixed(2)}</td>
                            <td className="py-1 text-right font-bold">{(item.quantity * item.price_unit).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr className="font-black"><td colSpan={3} className="pt-2 text-text-muted">Total</td><td className="pt-2 text-right text-primary">{Number(inv.amount_chf).toFixed(2)} CHF</td></tr></tfoot>
                    </table>
                    {inv.notes && <p className="text-xs text-text-muted mt-2 italic">{inv.notes}</p>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {noteModal && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center px-5">
          <div className="bg-card-bg rounded-3xl w-full max-w-sm p-5 shadow-xl">
            <h3 className="text-base font-black text-text-primary mb-2">Motif du refus</h3>
            <p className="text-xs text-text-muted mb-3">Optionnel — sera transmis au producteur</p>
            <textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Ex : prix trop élevé…" className="w-full px-4 py-3 rounded-xl border border-border text-sm resize-none mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setNoteModal(null)} className="flex-1 py-2.5 rounded-xl border border-border-light text-xs font-bold text-text-secondary">Annuler</button>
              <button onClick={() => handleProposalAction(noteModal, 'rejected')} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold">Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminProducteursPage() {
  const [tab, setTab] = useState('producteurs');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-4 pb-0 shrink-0">
        <h2 className="text-xl font-bold text-text-primary mb-3">Producteurs</h2>
        <div className="flex gap-2">
          <button onClick={() => setTab('producteurs')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${tab === 'producteurs' ? 'bg-primary text-white' : 'bg-card-bg text-text-secondary border border-border-light'}`}>
            <Users size={13} /> Comptes
          </button>
          <button onClick={() => setTab('requests')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${tab === 'requests' ? 'bg-primary text-white' : 'bg-card-bg text-text-secondary border border-border-light'}`}>
            <Lightbulb size={13} /> Demandes
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden mt-1">
        {tab === 'producteurs' ? <ProducersView /> : <RequestsView />}
      </div>
    </div>
  );
}
