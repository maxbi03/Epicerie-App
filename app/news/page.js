'use client';

import { useState } from 'react';
import { Star, CakeSlice, Leaf, Info } from 'lucide-react';

const newsItems = [
  { id: 1, category: 'offres', type: 'featured', title: '-20% sur tout le rayon Vrac', subtitle: 'Valable jusqu\'à dimanche soir.' },
  { id: 2, category: 'offres', type: 'icon', icon: 'loyalty', title: 'Points doublés !', subtitle: 'Aujourd\'hui, chaque achat local vous rapporte 2x plus de points score.' },
  { id: 3, category: 'evenements', type: 'event', icon: 'bakery_dining', label: 'Samedi 14h', title: 'Atelier Fabrication de Pain', subtitle: 'Venez apprendre à faire votre propre levain avec Frédéric.' },
  { id: 4, category: 'partenaires', type: 'partner', title: 'La Ferme de l\'Ours', subtitle: 'Yaourts bio au lait de brebis chaque mardi.' },
  { id: 5, category: 'com', type: 'info', title: 'Inventaire Annuel', subtitle: 'L\'épicerie sera exceptionnellement fermée lundi matin de 8h à 12h.' },
];

const filters = [
  { key: 'all', label: 'Tout' },
  { key: 'offres', label: 'Offres' },
  { key: 'evenements', label: 'Événements' },
  { key: 'partenaires', label: 'Partenaires' },
  { key: 'com', label: 'Infos' },
];

export default function NewsPage() {
  const [active, setActive] = useState('all');

  const visible = newsItems.filter(i => active === 'all' || i.category === active);

  return (
    <main className="relative flex min-h-screen max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-x-hidden border-x border-gray-200 dark:border-white/10">
      <div className="flex-1 overflow-y-auto pb-32">

        <div className="px-4 pt-6 pb-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Le Fil Rouge
          </h2>
          <p className="text-xs text-gray-500 mt-1">L'actualité de votre épicerie locale</p>
        </div>

        <div className="flex gap-2 p-4 overflow-x-auto sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-20">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActive(f.key)}
              className={`shrink-0 flex h-9 items-center justify-center rounded-xl px-5 border text-sm font-medium transition-all
                ${active === f.key
                  ? 'bg-green-500 text-white border-green-500 font-bold'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-6 px-4 pb-10 mt-2">
          {visible.map(item => {
            if (item.type === 'featured') return (
              <div key={item.id} className="bg-green-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest">Offre</span>
                <h3 className="text-xl font-bold mt-3">{item.title}</h3>
                <p className="text-white/80 text-xs mt-2 italic">{item.subtitle}</p>
              </div>
            );
            if (item.type === 'icon') return (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
                <div className="size-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0"><Star size={22} /></div>
                <div>
                  <h3 className="font-bold dark:text-white">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.subtitle}</p>
                </div>
              </div>
            );
            if (item.type === 'event') return (
              <div key={item.id} className="rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <div className="w-full h-32 bg-amber-500 flex items-center justify-center text-white"><CakeSlice size={48} /></div>
                <div className="p-4">
                  <span className="text-amber-500 text-[10px] font-bold uppercase">{item.label}</span>
                  <h3 className="font-bold dark:text-white">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                </div>
              </div>
            );
            if (item.type === 'partner') return (
              <div key={item.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4">
                <div className="flex gap-4">
                  <div className="size-14 rounded-full border-2 border-green-500 overflow-hidden shrink-0 bg-green-100 flex items-center justify-center text-green-600"><Leaf size={24} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-green-600 uppercase">Nouveau Partenaire</span>
                    <h3 className="font-bold dark:text-white">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            );
            if (item.type === 'info') return (
              <div key={item.id} className="flex items-center gap-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                <div className="size-12 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0"><Info size={22} /></div>
                <div>
                  <h3 className="font-bold text-blue-900 dark:text-blue-200 text-sm">{item.title}</h3>
                  <p className="text-[11px] text-blue-700/70 dark:text-blue-300/60">{item.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}