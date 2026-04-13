'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, ShoppingBasket, X, Check, Plus, ChevronRight } from 'lucide-react';
import { saveBasket } from '../lib/basket';

const MAX_LISTS = 5;

function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ListesPage() {
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedId, setLoadedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetch('/api/saved-lists')
      .then(r => r.ok ? r.json() : [])
      .then(data => setLists(data))
      .finally(() => setLoading(false));
  }, []);

  function loadList(list) {
    const flat = list.items.flatMap(item =>
      Array.from({ length: item.qty }, () => ({
        id: item.id, name: item.name, price: item.price, image: item.image, origin: item.origin,
      }))
    );
    saveBasket(flat);
    window.dispatchEvent(new Event('cart-updated'));
    setLoadedId(list.id);
    setTimeout(() => router.push('/panier'), 900);
  }

  async function deleteList(id) {
    if (!confirm('Supprimer cette liste ?')) return;
    setDeletingId(id);
    await fetch('/api/saved-lists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setLists(prev => prev.filter(l => l.id !== id));
    setDeletingId(null);
  }

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 h-full overflow-y-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Mes listes</h1>
          <p className="text-xs text-text-muted mt-0.5">{lists.length} / {MAX_LISTS} liste{lists.length > 1 ? 's' : ''}</p>
        </div>
        {/* Jauge */}
        <div className="flex gap-1">
          {Array.from({ length: MAX_LISTS }).map((_, i) => (
            <div key={i} className={`h-2 w-6 rounded-full transition-all ${i < lists.length ? 'bg-primary' : 'bg-border-light dark:bg-white/10'}`} />
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="size-16 rounded-2xl bg-primary-light flex items-center justify-center">
            <Bookmark size={28} className="text-primary" />
          </div>
          <div>
            <p className="font-black text-text-primary">Aucune liste sauvegardée</p>
            <p className="text-sm text-text-muted mt-1 max-w-[220px] mx-auto leading-relaxed">
              Remplissez votre panier et tapez "Sauvegarder cette liste" pour la retrouver ici.
            </p>
          </div>
          <button onClick={() => router.push('/panier')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white text-sm font-black active:scale-95 transition-all">
            <ShoppingBasket size={15} /> Aller au panier
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const total = list.items?.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;
            const count = list.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
            const isLoaded = loadedId === list.id;
            const isDeleting = deletingId === list.id;

            return (
              <div key={list.id} className="bg-card-bg rounded-3xl border border-border-light overflow-hidden shadow-sm">

                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                  <div className="size-10 rounded-2xl bg-primary-light flex items-center justify-center shrink-0">
                    <Bookmark size={17} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-text-primary truncate">{list.name}</p>
                    <p className="text-xs text-text-muted">{count} article{count > 1 ? 's' : ''} · {shortDate(list.created_at)}</p>
                  </div>
                  <button onClick={() => deleteList(list.id)} disabled={isDeleting}
                    className="size-8 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 active:scale-90 transition-all shrink-0">
                    <X size={14} />
                  </button>
                </div>

                {/* Produits */}
                <div className="px-5 pb-3 space-y-1.5">
                  {list.items?.map((item, j) => (
                    <div key={j} className="flex items-center gap-2.5">
                      {item.image
                        ? <img src={item.image} className="size-7 rounded-lg object-contain bg-white border border-gray-100 dark:border-white/10 shrink-0" alt="" />
                        : <div className="size-7 rounded-lg bg-primary-light shrink-0" />
                      }
                      <span className="flex-1 text-sm text-text-primary truncate">{item.name}</span>
                      <span className="text-xs text-text-muted shrink-0">×{item.qty}</span>
                      <span className="text-xs font-bold text-text-primary shrink-0">{(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Footer total + CTA */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border-light bg-app-bg/50">
                  <span className="text-sm font-black text-text-primary">{total.toFixed(2)} CHF</span>
                  <button onClick={() => loadList(list)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl font-black text-xs transition-all active:scale-95 ${
                      isLoaded ? 'bg-green-500 text-white' : 'bg-primary text-white shadow-md shadow-primary/20'
                    }`}>
                    {isLoaded ? <><Check size={13} /> Ajouté !</> : <><ShoppingBasket size={13} /> Charger</>}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Slot restants */}
          {lists.length < MAX_LISTS && (
            <button onClick={() => router.push('/panier')}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl border-2 border-dashed border-border-light text-text-muted text-sm font-bold active:scale-[0.98] transition-all hover:border-primary hover:text-primary">
              <Plus size={16} /> Nouvelle liste depuis le panier
            </button>
          )}

          {lists.length >= MAX_LISTS && (
            <p className="text-center text-xs text-text-muted py-2">
              Maximum {MAX_LISTS} listes atteint — supprimez-en une pour en ajouter une nouvelle.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
