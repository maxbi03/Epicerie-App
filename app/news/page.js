'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, X, ChevronLeft } from 'lucide-react';
import { fetchProducts } from '../lib/productsService';
import ProductModal from '../components/ProductModal';

const filters = [
  { key: 'all',        label: 'Tout' },
  { key: 'offres',     label: 'Offres' },
  { key: 'partenaires',label: 'Partenaires' },
  { key: 'com',        label: 'Infos' },
];

const CATEGORY = {
  offres:      { label: 'Offre',      color: 'text-primary' },
  partenaires: { label: 'Partenaire', color: 'text-violet-600 dark:text-violet-400' },
  com:         { label: 'Info',       color: 'text-sky-600 dark:text-sky-400' },
};

function catLabel(cat) { return CATEGORY[cat]?.label ?? 'Info'; }
function catColor(cat) { return CATEGORY[cat]?.color ?? 'text-sky-600'; }

/* ─── Petit utilitaire de date courte ─── */
function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'long' });
}

export default function NewsPage() {
  const [active, setActive] = useState('all');
  const [newsItems, setNewsItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/news').then(r => r.json()).catch(() => []),
      fetchProducts().catch(() => []),
    ]).then(([news, prods]) => {
      if (Array.isArray(news)) setNewsItems(news);
      if (Array.isArray(prods)) setProducts(prods);
    }).finally(() => setLoading(false));
  }, []);

  function handleLink(e, link) {
    if (!link) return;
    if (link.startsWith('product:')) {
      e.preventDefault();
      e.stopPropagation();
      const name = link.slice('product:'.length).trim();
      const found = products.find(p => (p.name || '').toLowerCase() === name.toLowerCase());
      if (found) setSelectedProduct(found);
    }
  }

  const visible = newsItems.filter(i => active === 'all' || i.category === active);
  const [hero, ...rest] = visible;

  return (
    <>
      <main className="relative flex h-full flex-col overflow-hidden">

        {/* ── Masthead ── */}
        <div className="shrink-0 px-5 pt-6 pb-3 border-b border-gray-200 dark:border-white/10">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-text-muted mb-0.5">L'Épicerie autonome</p>
          <h1 className="text-3xl font-black text-text-primary leading-none tracking-tight">Le Fil Rouge</h1>
        </div>

        {/* ── Filtres ── */}
        <div className="shrink-0 flex gap-0 px-5 pb-0 pt-0 overflow-x-auto border-b border-gray-200 dark:border-white/10">
          {filters.map(f => (
            <button key={f.key} onClick={() => setActive(f.key)}
              className={`shrink-0 h-10 px-4 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${
                active === f.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Feed ── */}
        <div className="flex-1 overflow-y-auto">

          {loading && (
            <div className="flex justify-center py-16">
              <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && visible.length === 0 && (
            <p className="text-center text-text-muted text-sm py-16">Aucune actualité pour le moment</p>
          )}

          {!loading && visible.length > 0 && (
            <div>

              {/* ── HERO ── */}
              <article
                onClick={() => hero.content && setSelectedNews(hero)}
                className={`relative w-full overflow-hidden ${hero.content ? 'cursor-pointer' : ''}`}
              >
                {hero.image1 ? (
                  <div className="relative h-64 w-full">
                    <img src={hero.image1} className="absolute inset-0 w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-white/70`}>
                        {catLabel(hero.category)}{hero.type ? ` · ${hero.type}` : ''}
                      </span>
                      <h2 className="text-white text-xl font-black leading-tight mt-1">{hero.title}</h2>
                      {hero.subtitle && (
                        <p className="text-white/70 text-sm mt-1 leading-snug line-clamp-2">{hero.subtitle}</p>
                      )}
                      {hero.created_at && (
                        <p className="text-white/40 text-[10px] mt-2 uppercase tracking-wider">{shortDate(hero.created_at)}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-5 pt-5 pb-4">
                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${catColor(hero.category)}`}>
                      {catLabel(hero.category)}{hero.type ? ` · ${hero.type}` : ''}
                    </span>
                    <h2 className="text-text-primary text-2xl font-black leading-tight mt-1">{hero.title}</h2>
                    {hero.subtitle && (
                      <p className="text-text-muted text-sm mt-1.5 leading-relaxed">{hero.subtitle}</p>
                    )}
                    {hero.content && (
                      <p className="text-text-muted text-sm mt-2 leading-relaxed line-clamp-3">{hero.content}</p>
                    )}
                    {hero.created_at && (
                      <p className="text-text-muted/50 text-[10px] mt-3 uppercase tracking-wider">{shortDate(hero.created_at)}</p>
                    )}
                  </div>
                )}

                {/* CTA link hero */}
                {hero.link && hero.category === 'offres' && (
                  <div className="px-5 pb-4">
                    {hero.link.startsWith('product:') ? (
                      <button onClick={e => handleLink(e, hero.link)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                        {hero.link_name || 'Voir le produit'} <ArrowRight size={12} />
                      </button>
                    ) : (
                      <Link href={hero.link} onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                        {hero.link_name || 'Voir plus'} <ArrowRight size={12} />
                      </Link>
                    )}
                  </div>
                )}
              </article>

              {/* ── Séparateur éditorial ── */}
              {rest.length > 0 && (
                <div className="mx-5 border-t border-gray-200 dark:border-white/10 mt-0" />
              )}

              {/* ── Articles standard ── */}
              {rest.map((item, i) => {
                const hasImage = item.image1 || item.image2;
                return (
                  <div key={item.id}>
                    <article
                      onClick={() => item.content && setSelectedNews(item)}
                      className={`flex gap-4 px-5 py-4 ${item.content ? 'cursor-pointer active:bg-gray-50 dark:active:bg-white/5 transition-colors' : ''}`}
                    >
                      {/* Text block */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${catColor(item.category)}`}>
                            {catLabel(item.category)}{item.type ? ` · ${item.type}` : ''}
                          </span>
                          <h3 className="text-text-primary text-[15px] font-black leading-snug mt-0.5 line-clamp-3">
                            {item.title}
                          </h3>
                          {item.subtitle && (
                            <p className="text-text-muted text-xs leading-relaxed mt-1 line-clamp-2">{item.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {item.created_at && (
                            <span className="text-text-muted/50 text-[10px] uppercase tracking-wider">{shortDate(item.created_at)}</span>
                          )}
                          {item.link && item.category === 'offres' && (
                            item.link.startsWith('product:') ? (
                              <button onClick={e => { e.stopPropagation(); handleLink(e, item.link); }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                                {item.link_name || 'Voir'} <ArrowRight size={10} />
                              </button>
                            ) : (
                              <Link href={item.link} onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                                {item.link_name || 'Voir plus'} <ArrowRight size={10} />
                              </Link>
                            )
                          )}
                        </div>
                      </div>

                      {/* Thumbnail */}
                      {hasImage && (
                        <div className="shrink-0 size-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5">
                          <img
                            src={item.image1 || item.image2}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                      )}
                    </article>

                    {/* Thin rule */}
                    {i < rest.length - 1 && (
                      <div className="mx-5 border-t border-gray-100 dark:border-white/5" />
                    )}
                  </div>
                );
              })}

              <div className="h-10" />
            </div>
          )}
        </div>
      </main>

      {/* ── Modal article ── */}
      {selectedNews && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="bg-white dark:bg-gray-950 rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Hero image modal */}
            {(selectedNews.image1 || selectedNews.image2) && (
              <div className="relative w-full h-56">
                <img
                  src={selectedNews.image1 || selectedNews.image2}
                  className="w-full h-full object-cover"
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-950 via-transparent to-transparent" />
                <button
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 size-9 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="px-6 pt-4 pb-10">
              {/* Close button if no image */}
              {!(selectedNews.image1 || selectedNews.image2) && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="size-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <span className={`text-[9px] font-black uppercase tracking-[0.25em] ${catColor(selectedNews.category)}`}>
                {catLabel(selectedNews.category)}{selectedNews.type ? ` · ${selectedNews.type}` : ''}
              </span>

              <h2 className="text-2xl font-black text-text-primary leading-tight mt-1">
                {selectedNews.title}
              </h2>

              {selectedNews.subtitle && (
                <p className="text-text-muted text-base font-medium mt-2 leading-relaxed">
                  {selectedNews.subtitle}
                </p>
              )}

              {selectedNews.created_at && (
                <p className="text-text-muted/50 text-[10px] uppercase tracking-widest mt-3">
                  {shortDate(selectedNews.created_at)}
                </p>
              )}

              {/* Thin rule */}
              <div className="border-t border-gray-200 dark:border-white/10 mt-4 mb-4" />

              {selectedNews.content && (
                <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {selectedNews.content}
                </p>
              )}

              {selectedNews.link && (
                <div className="mt-6">
                  {selectedNews.link.startsWith('product:') ? (
                    <button
                      onClick={e => { handleLink(e, selectedNews.link); setSelectedNews(null); }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-wider"
                    >
                      {selectedNews.link_name || 'Voir le produit'} <ArrowRight size={14} />
                    </button>
                  ) : (
                    <Link
                      href={selectedNews.link}
                      onClick={() => setSelectedNews(null)}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-white text-sm font-black uppercase tracking-wider"
                    >
                      {selectedNews.link_name || 'Voir plus'} <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}
