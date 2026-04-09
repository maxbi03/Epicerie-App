'use client';

import { useState, useEffect } from 'react';
import { fetchAdminNews, createNews, updateNews, deleteNews } from '../../lib/adminService';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, ImageIcon, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

// ─── Templates marketing ───────────────────────────────────────────────────────
const TEMPLATES = [
  // ── Offres ──
  {
    category: 'offres',
    key: 'promotion',
    label: 'Promotion',
    emoji: '🏷️',
    description: 'Prix réduit sur un produit',
    defaults: {
      subtitle: 'Valable jusqu\'au [DATE]',
      content: '[PRODUIT] à [PRIX] CHF au lieu de [PRIX NORMAL] CHF.\n\nProfitez-en, stock limité !',
      link_name: 'Voir le produit',
    },
    tips: {
      title: 'Ex : Gruyère AOP à -15% cette semaine',
      image1: 'Photo du produit en gros plan',
      link: 'product:[NomDuProduit]  →  ouvre la fiche produit',
    },
    fields: ['title', 'subtitle', 'content', 'image1', 'link', 'link_name'],
  },
  {
    category: 'offres',
    key: 'nouveau_produit',
    label: 'Nouveau produit',
    emoji: '✨',
    description: 'Annoncer l\'arrivée d\'un nouveau produit',
    defaults: {
      subtitle: 'Disponible dès maintenant',
      content: '[Description courte du produit]\n\nProduit par [PRODUCTEUR], [RÉGION].',
      link_name: 'Découvrir',
    },
    tips: {
      title: 'Ex : Nouveau ! Yogourt de brebis — Ferme Dupont',
      link: 'product:[NomDuProduit]  →  ouvre la fiche produit',
    },
    fields: ['title', 'subtitle', 'content', 'image1', 'link', 'link_name'],
  },
  {
    category: 'offres',
    key: 'selection',
    label: 'Sélection du moment',
    emoji: '🧺',
    description: 'Mettre en avant une sélection de produits',
    defaults: {
      content: 'Notre sélection du moment :\n\n• [Produit 1]\n• [Produit 2]\n• [Produit 3]\n\nRetrouvez-les à l\'épicerie !',
      link: '/stock',
      link_name: 'Voir tous les produits',
    },
    tips: {
      title: 'Ex : Le panier de printemps',
      image1: 'Photo de la sélection ou d\'ambiance',
    },
    fields: ['title', 'subtitle', 'content', 'image1', 'image2', 'link', 'link_name'],
  },
  // ── Partenaires ──
  {
    category: 'partenaires',
    key: 'portrait',
    label: 'Portrait producteur',
    emoji: '👨‍🌾',
    description: 'Présenter un partenaire local',
    defaults: {
      content: '[NOM] est [éleveur / maraîcher / fromager...] depuis [ANNÉE], basé à [LIEU].\n\n[Ce qui les rend uniques : méthodes, valeurs, histoire...]\n\nRetrouvez leurs produits à l\'épicerie !',
      link_name: 'Voir leurs produits',
    },
    tips: {
      title: 'Ex : La Ferme de la Côte — notre fromager local',
      subtitle: 'Ex : À 12 km de l\'épicerie, en activité depuis 1985',
      image1: 'Photo du producteur',
      image2: 'Photo du produit ou de la production',
      link: 'product:[NomProduit]  ou  /stock',
    },
    fields: ['title', 'subtitle', 'content', 'image1', 'image2', 'link', 'link_name'],
  },
  {
    category: 'partenaires',
    key: 'evenement',
    label: 'Événement',
    emoji: '📅',
    description: 'Visite de ferme, dégustation, atelier',
    defaults: {
      content: '📍 [LIEU]\n📅 [DATE], [HEURE]\n\n[Description de l\'événement]\n\nEntrée : [gratuite / sur inscription / prix]',
      link_name: 'En savoir plus',
    },
    tips: {
      title: 'Ex : Visite de la Ferme Dupont',
      subtitle: 'Ex : Samedi 15 mai, 14h–17h — entrée libre',
      image1: 'Photo du lieu ou de l\'événement',
    },
    fields: ['title', 'subtitle', 'content', 'image1', 'link', 'link_name'],
  },
  // ── Infos ──
  {
    category: 'com',
    key: 'info_pratique',
    label: 'Info pratique',
    emoji: 'ℹ️',
    description: 'Horaires, accès, conditions d\'utilisation',
    defaults: {},
    tips: {
      title: 'Ex : L\'épicerie est ouverte 24h/24 !',
      content: 'Fonctionnement de l\'accès, horaires, conditions...',
    },
    fields: ['title', 'subtitle', 'content', 'image1'],
  },
  {
    category: 'com',
    key: 'message',
    label: 'Message de l\'épicier',
    emoji: '💬',
    description: 'Message personnel aux clients',
    defaults: {
      content: 'Chers clients,\n\n[Votre message...]\n\nCordialement,\n[Votre signature]',
    },
    tips: {
      title: 'Ex : Merci pour votre fidélité !',
      image1: 'Photo de l\'épicerie ou de vous-même',
    },
    fields: ['title', 'subtitle', 'content', 'image1'],
  },
  {
    category: 'com',
    key: 'maintenance',
    label: 'Fermeture / Maintenance',
    emoji: '🔧',
    description: 'Informer d\'une fermeture temporaire',
    defaults: {
      subtitle: '[DATE], [HEURE] – [HEURE]',
      content: 'L\'épicerie sera temporairement inaccessible pour [raison].\n\nNous nous excusons pour la gêne occasionnée.',
    },
    tips: {
      title: 'Ex : Fermeture pour maintenance — Mardi 20h–22h',
    },
    fields: ['title', 'subtitle', 'content'],
  },
];

const CATEGORY_GROUPS = [
  {
    key: 'offres',
    label: 'Offres & Promotions',
    labelShort: 'Offres',
    color: 'text-green-600',
    cardClass: 'bg-green-50 border-green-200',
  },
  {
    key: 'partenaires',
    label: 'Partenaires locaux',
    labelShort: 'Partenaires',
    color: 'text-emerald-700',
    cardClass: 'bg-emerald-50 border-emerald-200',
  },
  {
    key: 'com',
    label: 'Informations',
    labelShort: 'Infos',
    color: 'text-blue-600',
    cardClass: 'bg-blue-50 border-blue-200',
  },
];

const ALL_FORM_FIELDS = ['title', 'subtitle', 'content', 'image1', 'image2', 'link', 'link_name'];

const EMPTY_FORM = {
  category: 'com',
  type: '',
  title: '',
  subtitle: '',
  content: '',
  image1: '',
  image2: '',
  link: '',
  link_name: '',
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminNewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // modal: null | 'picker' | 'form'
  const [modal, setModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAllFields, setShowAllFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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

  function openPicker() {
    setFormError('');
    setEditItem(null);
    setModal('picker');
  }

  function selectTemplate(template) {
    setForm({ ...EMPTY_FORM, category: template.category, type: template.key, ...template.defaults });
    setActiveTemplate(template);
    setShowAllFields(false);
    setFormError('');
    setModal('form');
  }

  function selectCustom() {
    setForm(EMPTY_FORM);
    setActiveTemplate(null);
    setShowAllFields(true);
    setFormError('');
    setModal('form');
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
    setEditItem(item);
    setActiveTemplate(null);
    setShowAllFields(true);
    setFormError('');
    setModal('form');
  }

  function closeModal() {
    setModal(null);
    setEditItem(null);
    setActiveTemplate(null);
    setFormError('');
  }

  function updateField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setFormError('Le titre est requis');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editItem) {
        await updateNews(editItem.id, form);
      } else {
        await createNews(form);
      }
      closeModal();
      await load();
    } catch (e) {
      setFormError(e.message);
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

  const visibleFields = (activeTemplate && !showAllFields)
    ? activeTemplate.fields
    : ALL_FORM_FIELDS;

  const hiddenFieldsCount = activeTemplate
    ? ALL_FORM_FIELDS.filter(f => !activeTemplate.fields.includes(f)).length
    : 0;

  function templateForItem(item) {
    return TEMPLATES.find(t => t.category === item.category && t.key === item.type);
  }

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
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Publications</h2>
        <button onClick={openPicker} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all">
          <Plus size={16} /> Nouvelle
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')}
          className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-primary text-white' : 'bg-card-bg border border-border-light text-text-secondary'}`}>
          Tout ({news.length})
        </button>
        {CATEGORY_GROUPS.map(cat => {
          const count = news.filter(n => n.category === cat.key).length;
          return (
            <button key={cat.key} onClick={() => setFilter(cat.key)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === cat.key ? 'bg-primary text-white' : 'bg-card-bg border border-border-light text-text-secondary'}`}>
              {cat.labelShort} ({count})
            </button>
          );
        })}
      </div>

      {/* News list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center text-text-secondary text-sm py-8">Aucune publication</p>
        )}
        {filtered.map(item => {
          const tpl = templateForItem(item);
          return (
            <div key={item.id}
              className={`flex items-center gap-3 rounded-2xl p-3 border shadow-sm transition-all ${
                item.is_published
                  ? 'bg-card-bg border-border-light'
                  : 'bg-gray-100 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 opacity-60'
              }`}>
              {item.image1 ? (
                <div className="size-12 rounded-xl overflow-hidden bg-app-bg shrink-0">
                  <img src={item.image1} className="w-full h-full object-cover" alt="" />
                </div>
              ) : (
                <div className="size-10 rounded-xl flex items-center justify-center shrink-0 text-lg bg-gray-50 dark:bg-gray-800">
                  {tpl?.emoji || '📰'}
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
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={`text-[10px] font-bold ${
                    item.category === 'offres' ? 'text-green-600' :
                    item.category === 'partenaires' ? 'text-emerald-700' :
                    'text-blue-500'
                  }`}>
                    {CATEGORY_GROUPS.find(c => c.key === item.category)?.labelShort || item.category}
                  </span>
                  {tpl && (
                    <span className="text-[10px] text-text-muted">· {tpl.label}</span>
                  )}
                  {(item.image1 || item.image2) && <ImageIcon size={10} className="text-text-muted" />}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => togglePublished(item)}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  {item.is_published ? <Eye size={16} className="text-green-500" /> : <EyeOff size={16} className="text-gray-400" />}
                </button>
                <button onClick={() => openEdit(item)}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Pencil size={16} className="text-blue-500" />
                </button>
                <button onClick={() => handleDelete(item)}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Template picker modal ─────────────────────────────────────── */}
      {modal === 'picker' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl max-h-[88vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10 z-10">
              <h3 className="text-lg font-bold">Quel type de publication ?</h3>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-6 pb-10">
              {CATEGORY_GROUPS.map(group => (
                <div key={group.key}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${group.color}`}>
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {TEMPLATES.filter(t => t.category === group.key).map(template => (
                      <button
                        key={template.key}
                        onClick={() => selectTemplate(template)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all active:scale-[0.98] hover:opacity-90 ${group.cardClass}`}
                      >
                        <span className="text-2xl leading-none">{template.emoji}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-gray-900">{template.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-100 dark:border-white/10 pt-4">
                <button
                  onClick={selectCustom}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border-light bg-card-bg text-left transition-all active:scale-[0.98] hover:opacity-90"
                >
                  <span className="text-2xl leading-none">✏️</span>
                  <div>
                    <p className="font-bold text-sm text-text-primary">Formulaire libre</p>
                    <p className="text-xs text-text-secondary mt-0.5">Remplir tous les champs manuellement</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Form modal ────────────────────────────────────────────────── */}
      {modal === 'form' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl p-5 space-y-4 max-h-[92vh] overflow-y-auto animate-slide-up">

            {/* Form header */}
            <div className="flex items-center gap-3">
              {!editItem && (
                <button
                  onClick={() => setModal('picker')}
                  className="size-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 active:scale-95 transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold truncate">
                  {editItem
                    ? 'Modifier la publication'
                    : activeTemplate
                      ? `${activeTemplate.emoji} ${activeTemplate.label}`
                      : 'Nouvelle publication'
                  }
                </h3>
                {activeTemplate && (
                  <p className="text-xs text-text-secondary">{activeTemplate.description}</p>
                )}
              </div>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Category badge (template mode) */}
            {activeTemplate && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                activeTemplate.category === 'offres' ? 'bg-green-50 border-green-200 text-green-700' :
                activeTemplate.category === 'partenaires' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                'bg-blue-50 border-blue-200 text-blue-600'
              }`}>
                {CATEGORY_GROUPS.find(c => c.key === activeTemplate.category)?.labelShort}
                <span className="opacity-50">·</span>
                {activeTemplate.label}
              </div>
            )}

            {/* Category selector (free form / edit) */}
            {!activeTemplate && (
              <div>
                <label className="text-xs font-bold text-text-secondary mb-2 block">Catégorie</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORY_GROUPS.map(cat => (
                    <button key={cat.key} onClick={() => updateField('category', cat.key)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        form.category === cat.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-text-secondary'
                      }`}>
                      {cat.labelShort}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic fields */}
            {visibleFields.map(field => (
              <FormField
                key={field}
                field={field}
                value={form[field]}
                onChange={v => updateField(field, v)}
                tip={activeTemplate?.tips?.[field]}
              />
            ))}

            {/* Show/hide extra fields toggle */}
            {activeTemplate && hiddenFieldsCount > 0 && (
              <button
                onClick={() => setShowAllFields(v => !v)}
                className="flex items-center gap-1.5 text-xs text-text-secondary font-medium py-1 hover:text-text-primary transition-colors"
              >
                {showAllFields
                  ? <><ChevronUp size={13} /> Masquer les champs supplémentaires</>
                  : <><ChevronDown size={13} /> {hiddenFieldsCount} champ{hiddenFieldsCount > 1 ? 's' : ''} supplémentaire{hiddenFieldsCount > 1 ? 's' : ''}</>
                }
              </button>
            )}

            {/* Image preview */}
            {(form.image1 || form.image2) && (
              <div className="flex gap-2">
                {form.image1 && (
                  <div className="flex-1 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={form.image1} className="w-full h-full object-cover" alt="Aperçu 1" onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                )}
                {form.image2 && (
                  <div className="flex-1 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={form.image2} className="w-full h-full object-cover" alt="Aperçu 2" onError={e => { e.target.style.display = 'none'; }} />
                  </div>
                )}
              </div>
            )}

            {formError && (
              <p className="text-sm text-red-500 font-medium">{formError}</p>
            )}

            <button onClick={handleSave} disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-all">
              {saving ? 'Enregistrement...' : editItem ? 'Enregistrer les modifications' : 'Publier'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FormField ─────────────────────────────────────────────────────────────────
const FIELD_LABELS = {
  title: 'Titre *',
  subtitle: 'Sous-titre',
  content: 'Contenu',
  image1: 'Image 1 (URL)',
  image2: 'Image 2 (URL)',
  link: 'Lien',
  link_name: 'Texte du lien',
};

const FIELD_PLACEHOLDERS = {
  title: 'Titre de la publication',
  subtitle: 'Sous-titre court',
  content: 'Contenu de la publication...',
  image1: 'https://...',
  image2: 'https://...',
  link: '/page  ou  product:NomDuProduit',
  link_name: 'Voir plus',
};

function FormField({ field, value, onChange, tip }) {
  return (
    <div>
      <label className="text-xs font-bold text-text-secondary mb-1 block">
        {FIELD_LABELS[field]}
      </label>
      {field === 'content' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={FIELD_PLACEHOLDERS[field]}
          rows={5}
          className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm resize-none dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-primary outline-none transition"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={FIELD_PLACEHOLDERS[field]}
          className="w-full p-3 rounded-xl border border-border-light bg-card-bg text-sm dark:border-white/10 dark:bg-white/5 dark:text-white focus:border-primary outline-none transition"
        />
      )}
      {tip && (
        <p className="text-[10px] text-text-muted mt-1 ml-1 leading-relaxed">{tip}</p>
      )}
    </div>
  );
}
