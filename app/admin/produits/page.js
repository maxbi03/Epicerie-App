'use client';

import { useEffect, useState } from 'react';
import { fetchAdminProducts, createProduct, updateProduct, deleteProduct } from '../../lib/adminService';
import { Pencil, X, AlertTriangle, Eye, EyeOff, Package, Plus, Minus, Check } from 'lucide-react';

function getCategories(products) {
  return [...new Set(products.map(p => p.category).filter(Boolean))].sort();
}
function getCategoriesFilter(products) {
  return ['Tous', ...getCategories(products)];
}

const EMPTY_FORM = { name: '', barcode: '', price_chf: '', quantity: '', description: '', category: 'Divers', image_url: '', producer: '', badge: '', stock_shelf: '0', stock_back: '0' };

export default function AdminProduits() {
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
  const [showDelivery, setShowDelivery] = useState(false);
  const [deliveryQtys, setDeliveryQtys] = useState({});
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryDone, setDeliveryDone] = useState(false);

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

  function openDelivery() {
    setDeliveryQtys({});
    setDeliveryDone(false);
    setShowDelivery(true);
  }

  function setDeliveryQty(id, value) {
    const n = Math.max(0, parseInt(value, 10) || 0);
    setDeliveryQtys(prev => ({ ...prev, [id]: n }));
  }

  function adjustDeliveryQty(id, delta) {
    setDeliveryQtys(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }

  async function handleDeliverySubmit() {
    const items = Object.entries(deliveryQtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({ id, qty }));
    if (items.length === 0) return;
    setDeliverySaving(true);
    try {
      const res = await fetch('/api/admin/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delivery', items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      setDeliveryDone(true);
      await loadProducts();
      setTimeout(() => setShowDelivery(false), 1200);
    } catch (err) {
      setError(err.message);
      setShowDelivery(false);
    } finally {
      setDeliverySaving(false);
    }
  }

  const activeProducts = products.filter(p => p.is_active === true);
  const deliveryTotal = Object.values(deliveryQtys).reduce((s, q) => s + (q || 0), 0);

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'Tous' || p.category === activeCategory;
    const matchSearch = (p.name || '').toLowerCase().includes(search.toLowerCase());
    if (!matchCat || !matchSearch) return false;
    const s = p.stock_shelf ?? 0;
    const b = p.stock_back ?? 0;
    const complete = isProductComplete(p);
    if (stockFilter === 'active') {
      return p.is_active === true;
    }
    if (stockFilter === 'inactive') {
      return complete && p.is_active === false;
    }
    if (stockFilter === 'incomplete') {
      return !complete;
    }
    if (stockFilter === 'low') {
      return complete && (s > 0 || b > 0) && (s <= 5 || b <= 5);
    }
    if (stockFilter === 'out') {
      return complete && s === 0 && b === 0;
    }
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
              onClick={openDelivery}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
            >
              <Package size={14} /> Livraison
            </button>
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
              return (
                <div key={product.id} className={`flex items-center gap-3 rounded-2xl p-3 border shadow-sm ${
                  incomplete ? 'bg-orange-50 border-orange-200'
                  : manuallyInactive ? 'bg-gray-50 border-gray-200'
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
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-text-muted">{Number(product.price_chf || 0).toFixed(2)} CHF</span>
                      <span className="text-[10px] text-text-muted">·</span>
                      <span className={`text-[10px] font-bold ${shelfStock === 0 ? 'text-red-500' : shelfStock <= 5 ? 'text-amber-500' : 'text-green-600'}`}>RAYON: {shelfStock}</span>
                      <span className={`text-[10px] font-bold ${backStock === 0 ? 'text-red-500' : backStock <= 5 ? 'text-amber-500' : 'text-green-600'}`}>STOCK: {backStock}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
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

              <button type="submit" disabled={saving}
                className="w-full bg-primary text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer le produit'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale Livraison ── */}
      {showDelivery && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => !deliverySaving && setShowDelivery(false)}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md flex flex-col max-h-[90vh] animate-slide-up" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border-light">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Package size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-lg font-black text-text-primary">Livraison fournisseur</h2>
                </div>
                <button onClick={() => setShowDelivery(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-app-bg transition-colors text-text-secondary">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-text-muted ml-11">Saisir les quantités reçues → ajoutées au stock réserve</p>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {activeProducts.map(product => {
                const qty = deliveryQtys[product.id] ?? 0;
                const hasQty = qty > 0;
                return (
                  <div key={product.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all ${hasQty ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-700' : 'bg-app-bg border-border-light'}`}>
                    {/* Image */}
                    <div className="size-10 rounded-xl overflow-hidden bg-white border border-gray-200 dark:border-white/10 shrink-0">
                      {product.image_url && <img src={product.image_url} className="w-full h-full object-contain" alt="" />}
                    </div>

                    {/* Name + current stock */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{product.name}</p>
                      <p className="text-[10px] text-text-muted">Réserve actuelle : <span className="font-bold">{product.stock_back ?? 0}</span></p>
                    </div>

                    {/* Qty stepper */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => adjustDeliveryQty(product.id, -1)}
                        className={`size-8 flex items-center justify-center rounded-lg transition-all active:scale-90 ${hasQty ? 'bg-amber-200 dark:bg-amber-700 text-amber-700 dark:text-amber-200' : 'bg-gray-100 dark:bg-white/10 text-text-muted'}`}
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={qty || ''}
                        placeholder="0"
                        onChange={e => setDeliveryQty(product.id, e.target.value)}
                        className={`w-12 text-center text-sm font-black rounded-lg border py-1.5 transition-all outline-none dark:bg-white/5 dark:text-white ${hasQty ? 'border-amber-300 dark:border-amber-600 bg-white text-amber-700' : 'border-border dark:border-white/10'}`}
                      />
                      <button
                        onClick={() => adjustDeliveryQty(product.id, 1)}
                        className={`size-8 flex items-center justify-center rounded-lg transition-all active:scale-90 ${hasQty ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-white/10 text-text-muted'}`}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border-light">
              {deliveryTotal > 0 && (
                <p className="text-center text-xs text-text-muted mb-3">
                  <span className="font-black text-amber-600">{deliveryTotal} unité{deliveryTotal > 1 ? 's' : ''}</span> à ajouter en réserve
              </p>
              )}
              <button
                onClick={handleDeliverySubmit}
                disabled={deliveryTotal === 0 || deliverySaving || deliveryDone}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
                  deliveryDone ? 'bg-green-500 text-white' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                }`}
              >
                {deliveryDone ? (
                  <><Check size={16} /> Stock mis à jour !</>
                ) : deliverySaving ? (
                  <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enregistrement...</>
                ) : (
                  <><Package size={16} /> Valider la livraison</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

