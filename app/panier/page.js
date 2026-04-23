'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Minus, Plus, Lock, Bookmark, Check, X } from 'lucide-react';
import { getBasket, saveBasket } from '../lib/basket';

export default function PanierPage() {
  const [basket, setBasket] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisitor, setIsVisitor] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | done | error

  useEffect(() => {
    setBasket(getBasket());
    setIsVisitor(sessionStorage.getItem('app_mode') === 'visitor');
  }, []);

  async function handleSaveList() {
    if (!saveName.trim()) return;
    setSaveStatus('saving');
    try {
      const items = Object.values(
        basket.reduce((acc, p) => {
          if (!acc[p.id]) acc[p.id] = { id: p.id, name: p.name, price: p.price, image: p.image, origin: p.origin, qty: 0 };
          acc[p.id].qty += 1;
          return acc;
        }, {})
      );
      const res = await fetch('/api/saved-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveName.trim(), items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      setSaveStatus('done');
      setTimeout(() => { setShowSave(false); setSaveName(''); setSaveStatus('idle'); }, 1500);
    } catch (err) {
      setSaveStatus(err.message || 'error');
    }
  }

  function updateBasket(newBasket) {
    saveBasket(newBasket);
    setBasket(newBasket);
  }

  function increaseQuantity(productId) {
    const product = basket.find(p => p.id === productId);
    if (product) updateBasket([...basket, product]);
  }

  function decreaseQuantity(productId) {
    const index = basket.findIndex(p => p.id === productId);
    if (index !== -1) {
      const newBasket = [...basket];
      newBasket.splice(index, 1);
      updateBasket(newBasket);
    }
  }

  function removeProduct(productId) {
    updateBasket(basket.filter(p => p.id !== productId));
  }

  const grouped = basket.reduce((acc, product) => {
    if (!acc[product.id]) acc[product.id] = { ...product, quantity: 0 };
    acc[product.id].quantity += 1;
    return acc;
  }, {});

  const groupedList = Object.values(grouped);
  const total = groupedList.reduce((sum, p) => sum + p.price * p.quantity, 0);

  async function handleCheckout() {
    setIsLoading(true);
    setError(null);
    try {
      let clientName = null;
      let clientUserId = null;
      try {
        const me = await fetch('/api/auth/me');
        if (me.ok) {
          const { user } = await me.json();
          clientName = user?.name || null;
          clientUserId = user?.id || null;
        }
      } catch (e) { console.warn('[checkout] fetch user info:', e); }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: groupedList,
          total,
          client_name: clientName,
          user_id: clientUserId,
        }),
      });
      const data = await res.json();
      console.log('Checkout response:', data);
      if (!res.ok) throw new Error(data.error || 'Erreur de paiement');
      if (!data.checkoutUrl) throw new Error('Pas d\'URL de paiement reçue');
      // Store payment ID for verification after redirect
      if (data.paymentId) {
        localStorage.setItem('pending_payment_id', data.paymentId);
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex h-full flex-col overflow-hidden">

      <div className="px-6 pt-6 pb-2 flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold tracking-tight dark:text-white">Mon Panier</h2>
        <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded tracking-widest">
          {basket.length} Article{basket.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">

        {groupedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-10 text-center py-20">
            <div className="size-20 bg-primary-light rounded-full flex items-center justify-center mb-4">
              <ShoppingCart size={36} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Votre panier est vide</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-[200px] mx-auto">
              Scannez vos produits en magasin pour les ajouter ici !
            </p>
            <Link href="/scanner" className="mt-6 flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest border-b border-primary pb-1 active:scale-95 transition-transform">
              Ouvrir le scanner
            </Link>
          </div>
        ) : (
          <div className="flex flex-col px-4 py-2">
            {groupedList.map(product => (
              <div key={product.id} className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 mb-3">
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-white rounded-2xl flex items-center justify-center border border-gray-200 dark:border-white/10 overflow-hidden">
                    {product.image && <img src={product.image} className="w-full h-full object-contain" alt={product.name} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-green-900 dark:text-gray-200">{product.name}</h4>
                    <p className="text-[10px] text-gray-400 font-medium">{product.origin}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-green-900 dark:text-white">
                      {(product.price * product.quantity).toFixed(2)} CHF
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <button onClick={() => decreaseQuantity(product.id)} className="size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
                      <Minus size={14} className="text-green-900" />
                    </button>
                    <span className="text-sm font-bold text-green-900 dark:text-white">{product.quantity}</span>
                    <button onClick={() => increaseQuantity(product.id)} className="size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
                      <Plus size={14} className="text-green-900" />
                    </button>
                  </div>
                  <button onClick={() => removeProduct(product.id)} className="text-red-500 text-xs font-bold uppercase tracking-widest">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 bg-white dark:bg-gray-900 px-6 pb-6 pt-4 border-t border-gray-100 dark:border-white/10">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Résumé</h3>
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}
        {/* Sauvegarder la liste */}
        {!isVisitor && groupedList.length > 0 && (
          <div className="mb-3">
            {!showSave ? (
              <button
                onClick={() => { setShowSave(true); setSaveStatus('idle'); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold text-text-muted border border-dashed border-border-light hover:border-primary hover:text-primary transition-all active:scale-[0.98]"
              >
                <Bookmark size={13} /> Sauvegarder cette liste
              </button>
            ) : (
              <div className="bg-card-bg rounded-2xl border border-primary/30 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-text-primary uppercase tracking-wider">Nommer la liste</p>
                  <button onClick={() => { setShowSave(false); setSaveName(''); setSaveStatus('idle'); }}>
                    <X size={14} className="text-text-muted" />
                  </button>
                </div>
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveList()}
                  placeholder="Ex : Courses hebdo, Petit-déjeuner…"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-border dark:border-white/10 bg-app-bg dark:bg-white/5 dark:text-white text-sm outline-none focus:border-primary transition-colors"
                />
                {saveStatus !== 'idle' && saveStatus !== 'saving' && saveStatus !== 'done' && (
                  <p className="text-[10px] text-red-500">{saveStatus}</p>
                )}
                <button
                  onClick={handleSaveList}
                  disabled={!saveName.trim() || saveStatus === 'saving' || saveStatus === 'done'}
                  className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50 ${saveStatus === 'done' ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}
                >
                  {saveStatus === 'done' ? <><Check size={13} /> Liste sauvegardée !</> : saveStatus === 'saving' ? 'Sauvegarde…' : <><Bookmark size={13} /> Sauvegarder</>}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-3xl p-1 border border-gray-100 dark:border-white/10">
          {isVisitor ? (
            <Link href="/" className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.1em] bg-primary/10 text-primary flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
              <Lock size={16} />
              Connexion requise
            </Link>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={groupedList.length === 0 || isLoading}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.1em] transition-all
                ${groupedList.length === 0 || isLoading
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:brightness-105 active:scale-[0.98]'
                }`}
            >
              {isLoading ? 'Redirection...' : groupedList.length === 0 ? 'Panier vide' : `Payer ${total.toFixed(2)} CHF`}
            </button>
          )}
        </div>
      </div>

    </main>
  );
}