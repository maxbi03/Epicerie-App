'use client';

import { useState, useEffect } from 'react';
import { fetchAdminNews, createNews, updateNews, deleteNews } from '../../lib/adminService';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Star, Leaf, Info, ImageIcon } from 'lucide-react';

const CATEGORIES = [
  { key: 'offres', label: 'Offres' },
  { key: 'partenaires', label: 'Partenaires' },
  { key: 'com', label: 'Infos' },
];

const EMPTY_FORM = { category: 'com', type: '', title: '', subtitle: '', content: '', image1: '', image2: '', link: '', link_name: '' };

export default function AdminNewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  async function load() {
    try {
      const data = await fetchAdminNews();
      setNews(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setError('');
    setModal('new');
  }

  function openEdit(item) {
    setForm({
      category: item.category || 'com',
      type: item.type || '',
      title: item.title || '',
      subtitle: item.subtitle || '',
      content: item.content || '',
      image1: item.image1 || '',
      image2: item.image2 || '',
      link: item.link || '',
      link_name: item.link_name || '',
    });
    setError('');
    setModal(item);
  }

  function closeModal() {
    setModal(null);
    setError('');
  }

  function updateField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Le titre est requis');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (modal === 'new') {
        await createNews(form);
      } else {
        await updateNews(modal.id, form);
      }
      closeModal();
      await load();
    } catch (e) {
      setError(e.message);
      closeModal();
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item) {
    try {
      await updateNews(item.id, { is_published: !item.is_published });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Supprimer "${item.title}" ?`)) return;
    try {
      await deleteNews(item.id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const filtered = news.filter(n => filter === 'all' || n.category === filter);

  const categoryLabel = (cat) => CATEGORIES.find(c => c.key === cat)?.label || cat;
  const CategoryIcon = (cat) => {
    if (cat === 'offres') return Star;
    if (cat === 'partenaires') return Leaf;
    return Info;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Publications</h2>
        <button onClick={openNew} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus size={16} /> Nouvelle
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-primary text-white' : 'bg-card-bg border border-border-light text-text-secondary'}`}>
          Tout ({news.length})
        </button>
        {CATEGORIES.map(cat => {
          const count = news.filter(n => n.category === cat.key).length;
          return (
            <button key={cat.key} onClick={() => setFilter(cat.key)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === cat.key ? 'bg-primary text-white' : 'bg-card-bg border border-border-light text-text-secondary'}`}>
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-text-secondary text-sm py-8">Aucune publication</p>
        )}
        {filtered.map(item => {
          const Icon = CategoryIcon(item.category);
          return (
            <div key={item.id} className={`flex items-center gap-3 rounded-2xl p-3 border shadow-sm ${item.is_published ? 'bg-card-bg border-border-light' : 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-60'}`}>
              {item.image1 ? (
                <div className="size-12 rounded-xl overflow-hidden bg-app-bg shrink-0">
                  <img src={item.image1} className="w-full h-full object-cover" alt="" />
                </div>
              ) : (
                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.category === 'offres' ? 'bg-green-100 text-green-600' :
                  item.category === 'partenaires' ? 'bg-green-100 text-green-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  <Icon size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm truncate">{item.title}</p>
                  {!item.is_published && (
                    <span className="shrink-0 text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-bold">Masqué</span>
                  )}
                </div>
                <p className="text-xs text-text-secondary truncate">{item.subtitle || item.content}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-text-secondary font-medium">{categoryLabel(item.category)}</span>
                  {item.type && <span className="text-[10px] text-text-secondary">· {item.type}</span>}
                  {(item.image1 || item.image2) && <ImageIcon size={10} className="text-text-secondary" />}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => togglePublished(item)} className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  {item.is_published ? <Eye size={16} className="text-green-500" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
                <button onClick={() => openEdit(item)} className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Pencil size={16} className="text-blue-500" />
                </button>
                <button onClick={() => handleDelete(item)} className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{modal === 'new' ? 'Nouvelle publication' : 'Modifier'}</h3>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary mb-1 block">Catégorie</label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button key={cat.key} onClick={() => updateField('category', cat.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${form.category === cat.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-text-secondary'}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary mb-1 block">Type (optionnel)</label>
              <input type="text" placeholder="Ex: featured, event, partner..." value={form.type}
                onChange={e => updateField('type', e.target.value)}
                className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary mb-1 block">Titre</label>
              <input type="text" placeholder="Titre de la publication" value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary mb-1 block">Sous-titre (optionnel)</label>
              <input type="text" placeholder="Sous-titre court" value={form.subtitle}
                onChange={e => updateField('subtitle', e.target.value)}
                className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary mb-1 block">Contenu</label>
              <textarea placeholder="Contenu de la publication" value={form.content}
                onChange={e => updateField('content', e.target.value)}
                rows={4}
                className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm resize-none" />
            </div>

            <div>
              <label className="text-xs font-bold text-text-secondary mb-1 block">Lien interne (optionnel)</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Ex: /stock, product:Gruyère" value={form.link}
                  onChange={e => updateField('link', e.target.value)}
                  className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm" />
                <input type="text" placeholder="Nom du lien (défaut: auto)" value={form.link_name}
                  onChange={e => updateField('link_name', e.target.value)}
                  className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block">Image 1 (URL)</label>
                <input type="text" placeholder="https://..." value={form.image1}
                  onChange={e => updateField('image1', e.target.value)}
                  className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-secondary mb-1 block">Image 2 (URL)</label>
                <input type="text" placeholder="https://..." value={form.image2}
                  onChange={e => updateField('image2', e.target.value)}
                  className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm" />
              </div>
            </div>

            {(form.image1 || form.image2) && (
              <div className="flex gap-2">
                {form.image1 && (
                  <div className="flex-1 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={form.image1} className="w-full h-full object-cover" alt="Preview 1" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
                {form.image2 && (
                  <div className="flex-1 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={form.image2} className="w-full h-full object-cover" alt="Preview 2" onError={e => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>
            )}

            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50">
              {saving ? 'Enregistrement...' : modal === 'new' ? 'Publier' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
