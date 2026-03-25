'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, CakeSlice, Leaf, Info, ArrowRight } from 'lucide-react';
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
  offres: { Icon: Star, color: 'green', badge: 'Offre', bgCard: 'bg-green-700' },
  evenements: { Icon: CakeSlice, color: 'amber', badge: 'Événement', bgCard: 'bg-amber-500' },
  partenaires: { Icon: Leaf, color: 'green', badge: 'Partenaire', bgCard: 'bg-green-600' },
  com: { Icon: Info, color: 'blue', badge: 'Info', bgCard: 'bg-blue-500' },
};

export default function NewsPage() {
  const [active, setActive] = useState('all');
  const [newsItems, setNewsItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

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
      const productName = link.slice('product:'.length).trim();
      const found = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
      if (found) setSelectedProduct(found);
    }
  }

  const visible = newsItems.filter(i => active === 'all' || i.category === active);

  return (
    <>
      <main className="relative flex min-h-screen max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-x-hidden border-x border-gray-200 dark:border-white/10">
        <div className="flex-1 overflow-y-auto pb-32">

          <div className="px-4 pt-6 pb-2">
            <h2 className="text-2xl font-bold flex items-center gap-2">Le Fil Rouge</h2>
            <p className="text-xs text-gray-500 mt-1">L'actualité de votre épicerie locale</p>
          </div>

          <div className="flex gap-2 p-4 overflow-x-auto sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-20">
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
              const { Icon, badge, bgCard } = config;
              const hasImages = item.image1 || item.image2;
              const isProductLink = item.link && item.link.startsWith('product:');

              return (
                <div key={item.id} className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
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
                  {!hasImages && (
                    <div className={`w-full h-24 ${bgCard} flex items-center justify-center text-white`}>
                      <Icon size={36} />
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed whitespace-pre-line">{item.content}</p>
                    {item.link && (
                      isProductLink ? (
                        <button
                          onClick={(e) => handleLink(e, item.link)}
                          className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-green-600 hover:text-green-700"
                        >
                          Voir le produit <ArrowRight size={14} />
                        </button>
                      ) : (
                        <Link href={item.link} className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-green-600 hover:text-green-700">
                          Voir plus <ArrowRight size={14} />
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

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </>
  );
}
