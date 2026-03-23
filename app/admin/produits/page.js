'use client';

import { useEffect, useState } from 'react';
import { fetchAdminProducts, createProduct, updateProduct, deleteProduct } from '../../lib/adminService';

const CATEGORIES_FILTER = ['Tous', 'Crèmerie', 'Boulangerie', 'Boissons', 'Epicerie', 'Fruits & Légumes', 'Divers'];
const CATEGORIES = ['Crèmerie', 'Boulangerie', 'Boissons', 'Epicerie', 'Fruits & Légumes', 'Divers'];

const EMPTY_FORM = { name: '', barcode: '', price_chf: '', description: '', category: 'Divers', image_url: '', producer: '', stock_shelf: '0', stock_back: '0' };

export default function AdminProduits() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');
  const [error, setError] = useState('');

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
      barcode: product.barcode || '',
      price_chf: String(product.price_chf ?? ''),
      description: product.description || '',
      category: product.category || 'Divers',
      image_url: product.image_url || '',
      producer: product.producer || '',
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

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const filtered = products.filter(p => {
    const matchCat = activeCategory === 'Tous' || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 shrink-0">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Produits</h2>
            <p className="text-sm text-text-secondary">{products.length} produits</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
          >
            + Ajouter
          </button>
        </div>

        {error && <div className="text-red-500 text-xs font-medium mb-3 p-3 bg-red-50 rounded-xl">{error}</div>}

        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white mb-3"
        />

        <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
          {CATEGORIES_FILTER.map(cat => (
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
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(product => (
              <div key={product.id} className="flex items-center gap-3 bg-card-bg rounded-2xl p-3 border border-border-light shadow-sm">
                <div className="size-12 rounded-xl overflow-hidden bg-app-bg shrink-0">
                  {product.image_url && <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-text-primary truncate">{product.name}</h4>
                  <p className="text-[10px] text-text-muted">{Number(product.price_chf).toFixed(2)} CHF · Rayon: {product.stock_shelf ?? 0} · Réserve: {product.stock_back ?? 0}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(product)} className="size-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-500 text-sm active:scale-90 transition-all">✎</button>
                  <button onClick={() => handleDelete(product.id)} className="size-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 text-sm active:scale-90 transition-all">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-card-bg rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card-bg/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-border-light">
              <h2 className="text-lg font-bold text-text-primary">{editingId ? 'Modifier' : 'Nouveau produit'}</h2>
              <button onClick={() => setShowForm(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-app-bg transition-colors text-text-secondary">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <input type="text" placeholder="Nom *" value={form.name} onChange={e => updateField('name', e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Code-barres" value={form.barcode} onChange={e => updateField('barcode', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                <input type="number" step="0.01" placeholder="Prix CHF *" value={form.price_chf} onChange={e => updateField('price_chf', e.target.value)} required
                  className="px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Description" value={form.description} onChange={e => updateField('description', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                <select value={form.category} onChange={e => updateField('category', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <input type="text" placeholder="Producteur / Origine" value={form.producer} onChange={e => updateField('producer', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
              <input type="text" placeholder="URL image" value={form.image_url} onChange={e => updateField('image_url', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Stock rayon</label>
                  <input type="number" placeholder="0" value={form.stock_shelf} onChange={e => updateField('stock_shelf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 block">Stock réserve</label>
                  <input type="number" placeholder="0" value={form.stock_back} onChange={e => updateField('stock_back', e.target.value)}
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
    </div>
  );
}

