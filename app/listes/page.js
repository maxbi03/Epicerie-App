'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, ShoppingBasket, X, Check, Plus, Minus } from 'lucide-react';
import { saveBasket } from '../lib/basket';
import { fetchProducts } from '../lib/productsService';

const MAX_LISTS = 5;

function shortDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ListesPage() {
  const router = useRouter();

  // Listes sauvegardées
  const [lists, setLists]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadedId, setLoadedId] = useState(null);

  // Modale nouvelle liste
  const [showModal, setShowModal]   = useState(false);
  const [products, setProducts]     = useState([]);
  const [prodLoading, setProdLoading] = useState(false);
  const [qtys, setQtys]             = useState({});
  const [listName, setListName]     = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | done | error
  const [saveError, setSaveError]   = useState('');

  useEffect(() => {
    fetch('/api/saved-lists')
      .then(r => r.ok ? r.json() : [])
      .then(data => setLists(data))
      .finally(() => setLoading(false));
  }, []);

  async function openModal() {
    setQtys({});
    setListName('');
    setSaveStatus('idle');
    setSaveError('');
    setShowModal(true);
    if (products.length === 0) {
      setProdLoading(true);
      const data = await fetchProducts().catch(() => []);
      setProducts(data); // already filtered to is_active=true by the API
      setProdLoading(false);
    }
  }

  function adjust(id, delta) {
    setQtys(prev => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));
  }

  function setQty(id, value) {
    setQtys(prev => ({ ...prev, [id]: Math.max(0, parseInt(value, 10) || 0) }));
  }

  const selectedTotal = Object.values(qtys).reduce((s, q) => s + q, 0);

  async function handleSave() {
    if (!listName.trim() || selectedTotal === 0) return;
    setSaveStatus('saving');
    setSaveError('');
    const items = products
      .filter(p => (qtys[p.id] ?? 0) > 0)
      .map(p => ({ id: p.id, name: p.name, price: p.price, image: p.image, origin: p.origin, qty: qtys[p.id] }));
    try {
      const res = await fetch('/api/saved-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: listName.trim(), items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      const newList = await res.json();
      setLists(prev => [newList, ...prev]);
      setSaveStatus('done');
      setTimeout(() => setShowModal(false), 1200);
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus('idle');
    }
  }

  // Charger une liste dans le panier
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
    await fetch('/api/saved-lists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setLists(prev => prev.filter(l => l.id !== id));
  }

  return (
    <>
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 h-full overflow-y-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Mes listes</h1>
          <p className="text-xs text-text-muted mt-0.5">{lists.length} / {MAX_LISTS} liste{lists.length > 1 ? 's' : ''}</p>
        </div>
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
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const total = list.items?.reduce((s, i) => s + i.price * i.qty, 0) ?? 0;
            const count = list.items?.reduce((s, i) => s + i.qty, 0) ?? 0;
            const isLoaded = loadedId === list.id;
            return (
              <div key={list.id} className="bg-card-bg rounded-3xl border border-border-light overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                  <div className="size-10 rounded-2xl bg-primary-light flex items-center justify-center shrink-0">
                    <Bookmark size={17} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-text-primary truncate">{list.name}</p>
                    <p className="text-xs text-text-muted">{count} article{count > 1 ? 's' : ''} · {shortDate(list.created_at)}</p>
                  </div>
                  <button onClick={() => deleteList(list.id)}
                    className="size-8 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 active:scale-90 transition-all shrink-0">
                    <X size={14} />
                  </button>
                </div>
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

          {/* Bouton nouvelle liste */}
          {lists.length < MAX_LISTS ? (
            <button onClick={openModal}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl border-2 border-dashed border-border-light text-text-muted text-sm font-bold active:scale-[0.98] transition-all hover:border-primary hover:text-primary">
              <Plus size={16} /> Nouvelle liste
            </button>
          ) : (
            <p className="text-center text-xs text-text-muted py-2">
              Maximum {MAX_LISTS} listes atteint — supprimez-en une pour en créer une nouvelle.
            </p>
          )}

          {lists.length === 0 && !loading && (
            <p className="text-center text-xs text-text-muted -mt-1 pb-2 leading-relaxed">
              Vous pouvez aussi sauvegarder un panier depuis la page panier.
            </p>
          )}
        </div>
      )}
    </main>

    {/* ── Modale nouvelle liste ── */}
    {showModal && (
      <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => saveStatus !== 'saving' && setShowModal(false)}>
        <div className="bg-card-bg rounded-t-3xl w-full max-w-md flex flex-col max-h-[90vh] animate-slide-up" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="shrink-0 px-5 pt-5 pb-4 border-b border-border-light">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-primary-light flex items-center justify-center">
                  <Bookmark size={15} className="text-primary" />
                </div>
                <h2 className="text-base font-black text-text-primary">Nouvelle liste</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-app-bg text-text-muted transition-colors">
                <X size={17} />
              </button>
            </div>
            <p className="text-xs text-text-muted ml-11">Sélectionnez les produits et les quantités souhaitées</p>
          </div>

          {/* Liste produits */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {prodLoading ? (
              <div className="flex justify-center py-10">
                <div className="size-6 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.map(product => {
              const qty = qtys[product.id] ?? 0;
              const active = qty > 0;
              return (
                <div key={product.id} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 border transition-all ${active ? 'bg-primary/5 border-primary/25 dark:border-primary/30' : 'bg-app-bg border-border-light'}`}>
                  <div className="size-10 rounded-xl overflow-hidden bg-white border border-gray-100 dark:border-white/10 shrink-0">
                    {product.image && <img src={product.image} className="w-full h-full object-contain" alt="" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{product.name}</p>
                    <p className="text-[10px] text-text-muted">{Number(product.price).toFixed(2)} CHF</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => adjust(product.id, -1)}
                      className={`size-8 flex items-center justify-center rounded-lg transition-all active:scale-90 ${active ? 'bg-primary/15 text-primary' : 'bg-gray-100 dark:bg-white/10 text-text-muted'}`}>
                      <Minus size={12} />
                    </button>
                    <input type="number" inputMode="numeric" min="0" value={qty || ''} placeholder="0"
                      onChange={e => setQty(product.id, e.target.value)}
                      className={`w-11 text-center text-sm font-black rounded-lg border py-1.5 outline-none dark:bg-white/5 dark:text-white transition-all ${active ? 'border-primary/30 text-primary' : 'border-border dark:border-white/10'}`} />
                    <button onClick={() => adjust(product.id, 1)}
                      className={`size-8 flex items-center justify-center rounded-lg transition-all active:scale-90 ${active ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/10 text-text-muted'}`}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 pb-6 pt-3 border-t border-border-light space-y-3">
            <input
              type="text"
              value={listName}
              onChange={e => setListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="Nom de la liste (ex : Courses hebdo)"
              className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 bg-app-bg dark:bg-white/5 dark:text-white text-sm outline-none focus:border-primary transition-colors"
            />
            {saveError && <p className="text-xs text-red-500 text-center">{saveError}</p>}
            {selectedTotal > 0 && (
              <p className="text-center text-xs text-text-muted">
                <span className="font-black text-primary">{selectedTotal} article{selectedTotal > 1 ? 's' : ''}</span> sélectionné{selectedTotal > 1 ? 's' : ''}
                {' · '}
                <span className="font-black text-text-primary">
                  {products.filter(p => (qtys[p.id] ?? 0) > 0).reduce((s, p) => s + p.price * qtys[p.id], 0).toFixed(2)} CHF
                </span>
              </p>
            )}
            <button onClick={handleSave}
              disabled={!listName.trim() || selectedTotal === 0 || saveStatus === 'saving' || saveStatus === 'done'}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
                saveStatus === 'done' ? 'bg-green-500 text-white' : 'bg-primary text-white shadow-lg shadow-primary/20'
              }`}>
              {saveStatus === 'done' ? <><Check size={15} /> Liste sauvegardée !</>
               : saveStatus === 'saving' ? <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sauvegarde…</>
               : <><Bookmark size={15} /> Sauvegarder la liste</>}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
