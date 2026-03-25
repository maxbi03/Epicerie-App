'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, CakeSlice, Leaf, Info, ArrowRight, X } from 'lucide-react';
import { fetchProducts } from '../lib/productsService';
import ProductModal from '../components/ProductModal';

const filters = [
  { key: 'all', label: 'Tout' },
  { key: 'offres', label: 'Offres' },
  { key: 'evenements', label: 'Événements' },
  { key: 'partenaires', label: 'Partenaires' },
  { key: 'com', label: 'Infos' },
];

const categoryConfig = {
  offres: { Icon: Star, badge: 'Offre' },
  evenements: { Icon: CakeSlice, badge: 'Événement' },
  partenaires: { Icon: Leaf, badge: 'Partenaire' },
  com: { Icon: Info, badge: 'Info' },
};

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
      const productName = link.slice('product:'.length).trim();
      const found = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
      if (found) setSelectedProduct(found);
    }
  }

  const visible = newsItems.filter(i => active === 'all' || i.category === active);

  return (
    <>
      <main className="relative flex h-full max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-x border-gray-200 dark:border-white/10">
        <div className="shrink-0 px-4 pt-6 pb-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">Le Fil Rouge</h2>
          <p className="text-xs text-gray-500 mt-1">L'actualité de votre épicerie locale</p>
        </div>

        <div className="shrink-0 flex gap-2 px-4 pb-3 overflow-x-auto">
            {filters.map(f => (
              <button key={f.key} onClick={() => setActive(f.key)}
                className={`shrink-0 flex h-9 items-center justify-center rounded-xl px-5 border text-sm font-medium transition-all
                  ${active === f.key
                    ? 'bg-green-500 text-white border-green-500 font-bold'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                {f.label}
              </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-6 px-4 pb-10 mt-2">
            {loading && (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && visible.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-12">Aucune actualité pour le moment</p>
            )}

            {visible.map(item => {
              const config = categoryConfig[item.category] || categoryConfig.com;
              const { badge } = config;
              const hasImages = item.image1 || item.image2;
              const isProductLink = item.link && item.link.startsWith('product:');

              return (
                <div key={item.id}
                  onClick={() => item.content && setSelectedNews(item)}
                  className={`rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm ${item.content ? 'cursor-pointer active:scale-[0.98] transition-all' : ''}`}
                >
                  {hasImages && (
                    <div className="w-full">
                      {item.image1 && item.image2 ? (
                        <div className="flex h-40">
                          <img src={item.image1} className="w-1/2 object-cover" alt="" />
                          <img src={item.image2} className="w-1/2 object-cover" alt="" />
                        </div>
                      ) : (
                        <img src={item.image1 || item.image2} className="w-full h-48 object-cover" alt="" />
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      item.category === 'offres' ? 'text-green-600' :
                      item.category === 'evenements' ? 'text-amber-500' :
                      item.category === 'partenaires' ? 'text-green-600' :
                      'text-blue-500'
                    }`}>{badge}{item.type ? ` · ${item.type}` : ''}</span>
                    <h3 className="font-bold text-lg mt-1 dark:text-white">{item.title}</h3>
                    {item.subtitle && (
                      <p className="text-sm text-gray-500 mt-0.5">{item.subtitle}</p>
                    )}
                    {item.content && (
                      <div className="relative mt-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line line-clamp-2">{item.content}</p>
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent" />
                      </div>
                    )}
                    {item.link && item.category === 'offres' && (
                      isProductLink ? (
                        <button
                          onClick={(e) => handleLink(e, item.link)}
                          className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-green-600 hover:text-green-700"
                        >
                          {item.link_name || 'Voir le produit'} <ArrowRight size={14} />
                        </button>
                      ) : (
                        <Link href={item.link} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-green-600 hover:text-green-700">
                          {item.link_name || 'Voir plus'} <ArrowRight size={14} />
                        </Link>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Modal fiche news */}
      {selectedNews && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/60 z-50 flex items-end justify-center animate-fade-in" onClick={() => setSelectedNews(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Actualité</h2>
              <button onClick={() => setSelectedNews(null)}
                className="size-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:bg-gray-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(selectedNews.image1 || selectedNews.image2) && (
                <div className="w-full">
                  {selectedNews.image1 && selectedNews.image2 ? (
                    <div className="flex gap-2 h-48">
                      <img src={selectedNews.image1} className="w-1/2 object-cover rounded-2xl" alt="" />
                      <img src={selectedNews.image2} className="w-1/2 object-cover rounded-2xl" alt="" />
                    </div>
                  ) : (
                    <img src={selectedNews.image1 || selectedNews.image2} className="w-full h-52 object-cover rounded-2xl" alt="" />
                  )}
                </div>
              )}

              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${
                  selectedNews.category === 'offres' ? 'text-green-600' :
                  selectedNews.category === 'evenements' ? 'text-amber-500' :
                  selectedNews.category === 'partenaires' ? 'text-green-600' :
                  'text-blue-500'
                }`}>{(categoryConfig[selectedNews.category] || categoryConfig.com).badge}{selectedNews.type ? ` · ${selectedNews.type}` : ''}</span>
                <h3 className="text-xl font-bold mt-1 dark:text-white">{selectedNews.title}</h3>
                {selectedNews.subtitle && (
                  <p className="text-sm text-gray-500 mt-1">{selectedNews.subtitle}</p>
                )}
              </div>

              {selectedNews.content && (
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{selectedNews.content}</p>
              )}

              {selectedNews.link && (
                selectedNews.link.startsWith('product:') ? (
                  <button
                    onClick={(e) => { handleLink(e, selectedNews.link); setSelectedNews(null); }}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-green-600 hover:text-green-700"
                  >
                    {selectedNews.link_name || 'Voir le produit'} <ArrowRight size={14} />
                  </button>
                ) : (
                  <Link href={selectedNews.link} onClick={() => setSelectedNews(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-green-600 hover:text-green-700">
                    {selectedNews.link_name || 'Voir plus'} <ArrowRight size={14} />
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}
