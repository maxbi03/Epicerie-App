'use client';

import { useEffect, useState } from 'react';
import { fetchAdminProducts, createProduct, updateProduct, deleteProduct } from '../../lib/adminService';
import { Pencil, X, AlertTriangle, Eye, EyeOff, Check, Printer, Tag } from 'lucide-react';

// ─── helpers produits ──────────────────────────────────────────────────────────

function getCategories(products) {
  return [...new Set(products.map(p => p.category).filter(Boolean))].sort();
}
function getCategoriesFilter(products) {
  return ['Tous', ...getCategories(products)];
}

const EMPTY_FORM = { name: '', barcode: '', price_chf: '', quantity: '', description: '', category: 'Divers', image_url: '', producer: '', badge: '', stock_shelf: '0', stock_back: '0', expiry_date: '', discount_percent: '', discount_until: '' };

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

function LabelPrintModal({ product, onClose }) {
  const discountedPrice = product.discount_percent > 0
    ? Number(product.price_chf) * (1 - Number(product.discount_percent) / 100)
    : null;
  return (
    <div className="fixed inset-0 backdrop-blur-sm z-[60] flex items-center justify-center px-5">
      <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Aperçu étiquette</p>
          <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <div id="print-label" className="p-5 bg-white">
          {product.discount_percent > 0 && (
            <div className="bg-red-500 text-white text-center py-2 rounded-xl mb-3">
              <p className="text-2xl font-black">ACTION -{product.discount_percent}%</p>
            </div>
          )}
          <p className="text-lg font-black text-gray-900 text-center leading-tight mb-1">{product.name}</p>
          <p className="text-xs text-gray-500 text-center mb-3">{product.quantity} · {product.producer}</p>
          {discountedPrice !== null ? (
            <div className="text-center">
              <p className="text-sm text-gray-400 line-through">{Number(product.price_chf).toFixed(2)} CHF</p>
              <p className="text-3xl font-black text-red-600">{discountedPrice.toFixed(2)} CHF</p>
            </div>
          ) : (
            <p className="text-3xl font-black text-gray-900 text-center">{Number(product.price_chf).toFixed(2)} CHF</p>
          )}
          {product.expiry_date && (
            <p className="text-[10px] text-center text-gray-400 mt-3 border-t border-gray-100 pt-2">
              À consommer de préférence avant le {new Date(product.expiry_date).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}
          {product.discount_until && (
            <p className="text-[10px] text-center text-red-400 mt-1">Offre valable jusqu'au {new Date(product.discount_until).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
          )}
        </div>
        <div className="px-5 pb-5">
          <button
            onClick={() => {
              const discPrice = product.discount_percent > 0
                ? (Number(product.price_chf) * (1 - Number(product.discount_percent) / 100)).toFixed(2)
                : null;
              const expiryStr = product.expiry_date
                ? new Date(product.expiry_date).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : null;
              const untilStr = product.discount_until
                ? new Date(product.discount_until).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : null;
              const win = window.open('', '_blank');
              win.document.write(`<!DOCTYPE html><html><head><title>Étiquette ${product.name}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:24px;max-width:300px}
  .action{background:#ef4444;color:#fff;text-align:center;padding:10px;border-radius:10px;margin-bottom:12px;font-size:22px;font-weight:900}
  .name{font-size:18px;font-weight:900;text-align:center;margin-bottom:4px}
  .sub{font-size:11px;color:#888;text-align:center;margin-bottom:12px}
  .oldprice{font-size:13px;color:#aaa;text-align:center;text-decoration:line-through}
  .price{font-size:34px;font-weight:900;text-align:center;color:${discPrice ? '#dc2626' : '#111'}}
  .note{font-size:10px;color:#bbb;text-align:center;margin-top:12px;border-top:1px solid #eee;padding-top:8px}
  @media print{body{margin:0}}
</style></head><body>
  ${product.discount_percent > 0 ? `<div class="action">ACTION -${product.discount_percent}%</div>` : ''}
  <div class="name">${product.name}</div>
  <div class="sub">${[product.quantity, product.producer].filter(Boolean).join(' · ')}</div>
  ${discPrice ? `<div class="oldprice">${Number(product.price_chf).toFixed(2)} CHF</div><div class="price">${discPrice} CHF</div>` : `<div class="price">${Number(product.price_chf).toFixed(2)} CHF</div>`}
  ${expiryStr ? `<div class="note">À consommer de préférence avant le ${expiryStr}</div>` : ''}
  ${untilStr ? `<div class="note" style="color:#ef4444">Offre valable jusqu'au ${untilStr}</div>` : ''}
</body></html>`);
              win.document.close();
              win.focus();
              win.print();
            }}
            className="w-full py-3 bg-primary text-white font-black rounded-2xl flex items-center justify-center gap-2"
          >
            <Printer size={16} /> Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}
// ─── Vue Catalogue (produits) ─────────────────────────────────────────────────

function CatalogueView() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [stockFilter, setStockFilter] = useState('all');
  const [error, setError] = useState('');
  const [printLabel, setPrintLabel] = useState(null);

  async function loadProducts() {
    try {
      const data = await fetchAdminProducts();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setError('');
  }

  function openEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || '',
      barcode: String(product.barcode || ''),
      price_chf: String(product.price_chf ?? ''),
      quantity: product.quantity || '',
      description: product.description || '',
      category: product.category || 'Divers',
      image_url: product.image_url || '',
      producer: product.producer || '',
      badge: product.badge || '',
      stock_shelf: String(product.stock_shelf ?? 0),
      stock_back: String(product.stock_back ?? 0),
      expiry_date: product.expiry_date ? product.expiry_date.slice(0, 10) : '',
      discount_percent: product.discount_percent != null ? String(product.discount_percent) : '',
      discount_until: product.discount_until ? product.discount_until.slice(0, 10) : '',
    });
    setShowForm(true);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateProduct(editingId, form);
      } else {
        await createProduct(form);
      }
      setShowForm(false);
      setLoading(true);
      await loadProducts();
    } catch (err) {
      setShowForm(false);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce produit ?')) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  const REQUIRED_FIELDS = ['name', 'barcode', 'price_chf', 'quantity', 'category', 'image_url', 'producer'];

  function isProductComplete(p) {
    return REQUIRED_FIELDS.every(f => {
      const val = p[f];
      if (val == null) return false;
      if (typeof val === 'string' && val.trim() === '') return false;
      if (f === 'price_chf' && Number(val) <= 0) return false;
      if (f === 'barcode' && !/^\d{13}$/.test(String(val).trim())) return false;
      return true;
    });
  }

  async function handleToggleActive(product) {
    if (!isProductComplete(product)) return;
    try {
      const updated = await updateProduct(product.id, { is_active: !product.is_active, _manual_toggle: true });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updated } : p));
    } catch (err) {
      setError(err.message);
    }
  }

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'Tous' || p.category === activeCategory;
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchCat || !matchSearch) return false;
    const s = p.stock_shelf ?? 0;
    const b = p.stock_back ?? 0;
    const complete = isProductComplete(p);
    if (stockFilter === 'active') return p.is_active === true;
    if (stockFilter === 'inactive') return complete && p.is_active === false;
    if (stockFilter === 'incomplete') return !complete;
    if (stockFilter === 'low') return complete && (s > 0 || b > 0) && (s <= 5 || b <= 5);
    if (stockFilter === 'out') return complete && s === 0 && b === 0;
    if (stockFilter === 'dlc') { const d = daysUntil(p.expiry_date); return d !== null && d <= 7; }
    if (stockFilter === 'promo') return Number(p.discount_percent) > 0;
    return true;
  }).sort((a, b) => {
    const aInactive = a.is_active === false ? 0 : 1;
    const bInactive = b.is_active === false ? 0 : 1;
    if (aInactive !== bInactive) return aInactive - bInactive;
    const aOut = (a.stock_shelf ?? 0) === 0 && (a.stock_back ?? 0) === 0 ? 0 : 1;
    const bOut = (b.stock_shelf ?? 0) === 0 && (b.stock_back ?? 0) === 0 ? 0 : 1;
    if (aOut !== bOut) return aOut - bOut;
    const aLow = (a.stock_shelf ?? 0) <= 5 || (a.stock_back ?? 0) <= 5 ? 0 : 1;
    const bLow = (b.stock_shelf ?? 0) <= 5 || (b.stock_back ?? 0) <= 5 ? 0 : 1;
    return aLow - bLow;
  });

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="px-5 pt-4 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Produits</h2>
            <p className="text-sm text-text-secondary">{products.length} produits</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCreate}
              className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0"><X size={16} /></button>
          </div>
        )}

        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white mb-3"
        />

        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {getCategoriesFilter(products).map(cat => (
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

        <div className="flex gap-2 pb-3 mb-3 overflow-x-auto">
          {[
            { key: 'all', label: 'Tous' },
            { key: 'active', label: 'Actifs' },
            { key: 'inactive', label: 'Inactifs' },
            { key: 'incomplete', label: 'Incomplets' },
            { key: 'low', label: 'Stock faible' },
            { key: 'out', label: 'Rupture' },
            { key: 'dlc', label: 'DLC proche' },
            { key: 'promo', label: 'En promo' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStockFilter(f.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all
                ${stockFilter === f.key
                  ? f.key === 'low' ? 'bg-amber-500 text-white'
                  : f.key === 'out' ? 'bg-red-500 text-white'
                  : f.key === 'incomplete' ? 'bg-orange-400 text-white'
                  : f.key === 'inactive' ? 'bg-gray-400 text-white'
                  : f.key === 'dlc' ? 'bg-purple-500 text-white'
                  : f.key === 'promo' ? 'bg-red-500 text-white'
                  : 'bg-primary text-white'
                  : 'bg-card-bg text-text-secondary border border-border-light'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(product => {
              const complete = isProductComplete(product);
              const incomplete = !complete;
              const manuallyInactive = complete && product.is_active === false;
              const inactive = product.is_active === false;
              const shelfStock = product.stock_shelf ?? 0;
              const backStock = product.stock_back ?? 0;
              const outOfStock = shelfStock === 0 && backStock === 0;
              const lowStock = !outOfStock && (shelfStock <= 5 || backStock <= 5);
              const dlcDays = daysUntil(product.expiry_date);
              const dlcUrgent = dlcDays !== null && dlcDays <= 7;
              const hasDiscount = Number(product.discount_percent) > 0;
              return (
                <div key={product.id} className={`flex items-center gap-3 rounded-2xl p-3 border shadow-sm ${
                  incomplete ? 'bg-orange-50 border-orange-200'
                  : manuallyInactive ? 'bg-gray-50 border-gray-200'
                  : dlcUrgent ? 'bg-purple-50/60 border-purple-200'
                  : outOfStock ? 'bg-red-50/50 border-red-200'
                  : lowStock ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-card-bg border-border-light'
                }`}>
                  <div className="size-12 rounded-xl overflow-hidden bg-white border border-gray-200 dark:border-white/10 shrink-0">
                    {product.image_url && <img src={product.image_url} className={`w-full h-full object-contain ${inactive ? 'opacity-50' : ''}`} alt={product.name} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-bold text-sm truncate ${incomplete ? 'text-orange-500' : manuallyInactive ? 'text-gray-400' : 'text-text-primary'}`}>{product.name || 'Sans nom'}</h4>
                      {incomplete && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 shrink-0">Incomplet</span>}
                      {manuallyInactive && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">Inactif</span>}
                      {!inactive && outOfStock && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-100 text-red-500 shrink-0">Rupture</span>}
                      {!inactive && lowStock && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 shrink-0">Stock faible</span>}
                      {dlcUrgent && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 shrink-0">DLC {dlcDays <= 0 ? 'dépassée' : `J-${dlcDays}`}</span>}
                      {hasDiscount && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-100 text-red-600 shrink-0">-{product.discount_percent}%</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-text-muted">{Number(product.price_chf || 0).toFixed(2)} CHF</span>
                      <span className="text-[10px] text-text-muted">·</span>
                      <span className={`text-[10px] font-bold ${shelfStock === 0 ? 'text-red-500' : shelfStock <= 5 ? 'text-amber-500' : 'text-green-600'}`}>RAYON: {shelfStock}</span>
                      <span className={`text-[10px] font-bold ${backStock === 0 ? 'text-red-500' : backStock <= 5 ? 'text-amber-500' : 'text-green-600'}`}>STOCK: {backStock}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {(hasDiscount || dlcUrgent) && (
                      <button onClick={() => setPrintLabel(product)} className="size-9 flex items-center justify-center rounded-xl bg-purple-50 text-purple-500 text-sm active:scale-90 transition-all">
                        <Printer size={15} />
                      </button>
                    )}
                    {isProductComplete(product) && (
                      <button onClick={() => handleToggleActive(product)} className={`size-9 flex items-center justify-center rounded-xl text-sm active:scale-90 transition-all ${product.is_active ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'}`}>
                        {product.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    )}
                    <button onClick={() => openEdit(product)} className="size-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 text-sm active:scale-90 transition-all"><Pencil size={16} /></button>
                    <button onClick={() => handleDelete(product.id)} className="size-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 text-sm active:scale-90 transition-all"><X size={16} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => setShowForm(false)}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card-bg/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">{editingId ? 'Modifier' : 'Nouveau produit'}</h2>
              <button onClick={() => setShowForm(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-app-bg transition-colors text-text-secondary"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Nom</label>
                <input type="text" placeholder="Nom du produit" value={form.name} onChange={e => updateField('name', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Code-barres</label>
                  <input type="text" placeholder="EAN-13" maxLength={13} value={form.barcode} onChange={e => updateField('barcode', e.target.value.replace(/\D/g, '').slice(0, 13))}
                    className={`w-full px-4 py-3 rounded-xl border text-sm dark:bg-white/5 dark:text-white ${form.barcode && form.barcode.length !== 13 ? 'border-red-300 dark:border-red-700' : 'border-border dark:border-white/10'}`} />
                  {form.barcode && form.barcode.length !== 13 && (
                    <p className="text-[10px] text-red-500 mt-1">{form.barcode.length}/13 chiffres</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Prix CHF</label>
                  <input type="number" step="0.01" placeholder="0.00" value={form.price_chf} onChange={e => updateField('price_chf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Catégorie</label>
                  <select value={form.category} onChange={e => updateField('category', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm">
                    {getCategories(products).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Quantité</label>
                  <input type="text" placeholder="ex: 500g" value={form.quantity} onChange={e => updateField('quantity', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Producteur / Marque</label>
                  <input type="text" placeholder="Nom du producteur" value={form.producer} onChange={e => updateField('producer', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Badge</label>
                  <input type="text" placeholder="ex: swiss_flag" value={form.badge} onChange={e => updateField('badge', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Description</label>
                <textarea placeholder="Description du produit" value={form.description} onChange={e => updateField('description', e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">URL image</label>
                <input type="text" placeholder="https://..." value={form.image_url} onChange={e => updateField('image_url', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
              </div>
              {form.image_url && (
                <div className="w-full h-36 rounded-xl overflow-hidden bg-white border border-gray-200 dark:border-white/10">
                  <img src={form.image_url} alt="Aperçu" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Stock rayon</label>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" value={form.stock_shelf} onChange={e => updateField('stock_shelf', Math.max(0, e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Stock réserve</label>
                  <input type="number" inputMode="numeric" pattern="[0-9]*" min="0" placeholder="0" value={form.stock_back} onChange={e => updateField('stock_back', Math.max(0, e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
              </div>

              <div className="border-t border-border-light pt-3 mt-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5"><Tag size={11} /> Promotion & DLC</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">DLC (date limite)</label>
                    <input type="date" value={form.expiry_date} onChange={e => updateField('expiry_date', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Remise %</label>
                    <input type="number" min="0" max="100" step="1" placeholder="0" value={form.discount_percent} onChange={e => updateField('discount_percent', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                  </div>
                </div>
                {Number(form.discount_percent) > 0 && (
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Promo valable jusqu'au</label>
                    <input type="date" value={form.discount_until} onChange={e => updateField('discount_until', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                  </div>
                )}
                {Number(form.discount_percent) > 0 && form.price_chf && (
                  <p className="text-xs text-red-500 font-bold mt-2">
                    Prix après remise : {(Number(form.price_chf) * (1 - Number(form.discount_percent) / 100)).toFixed(2)} CHF
                  </p>
                )}
              </div>

              <button type="submit" disabled={saving}
                className="w-full bg-primary text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer le produit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {printLabel && <LabelPrintModal product={printLabel} onClose={() => setPrintLabel(null)} />}

    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function AdminProduits() {
  return <CatalogueView />;
}
