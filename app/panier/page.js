'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PanierPage() {
  const [basket, setBasket] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('user_basket') || '[]');
    setBasket(stored);
  }, []);

  function saveBasket(newBasket) {
    localStorage.setItem('user_basket', JSON.stringify(newBasket));
    setBasket(newBasket);
    window.dispatchEvent(new Event('cart-updated'));
  }

  function increaseQuantity(productId) {
    const product = basket.find(p => p.id === productId);
    if (product) saveBasket([...basket, product]);
  }

  function decreaseQuantity(productId) {
    const index = basket.findIndex(p => p.id === productId);
    if (index !== -1) {
      const newBasket = [...basket];
      newBasket.splice(index, 1);
      saveBasket(newBasket);
    }
  }

  function removeProduct(productId) {
    saveBasket(basket.filter(p => p.id !== productId));
  }

  const grouped = basket.reduce((acc, product) => {
    if (!acc[product.id]) acc[product.id] = { ...product, quantity: 0 };
    acc[product.id].quantity += 1;
    return acc;
  }, {});

  const groupedList = Object.values(grouped);
  const total = groupedList.reduce((sum, p) => sum + p.price * p.quantity, 0);

  return (
    <div className="relative flex h-screen max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-x border-gray-200 dark:border-white/10">

      <div className="px-6 pt-6 pb-2 flex justify-between items-center shrink-0">
        <h2 className="text-2xl font-bold tracking-tight dark:text-white">Mon Panier</h2>
        <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded tracking-widest">
          {basket.length} Article{basket.length > 1 ? 's' : ''}
        </span>
      </div>

      <main className="flex-1 overflow-y-auto">

        {groupedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-10 text-center py-20">
            <div className="size-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🛒</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Votre panier est vide</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-[200px] mx-auto">
              Scannez vos produits en magasin pour les ajouter ici !
            </p>
            <Link href="/scanner" className="mt-6 flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest border-b border-green-600 pb-1 active:scale-95 transition-transform">
              Ouvrir le scanner
            </Link>
          </div>
        ) : (
          <div className="flex flex-col px-4 py-2">
            {groupedList.map(product => (
              <div key={product.id} className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 mb-3">
                <div className="flex items-center gap-4">
                  <div className="size-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-white/10 overflow-hidden">
                    {product.image && <img src={product.image} className="w-full h-full object-cover" alt={product.name} />}
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
                      <span className="text-green-900 font-bold">−</span>
                    </button>
                    <span className="text-sm font-bold text-green-900 dark:text-white">{product.quantity}</span>
                    <button onClick={() => increaseQuantity(product.id)} className="size-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
                      <span className="text-green-900 font-bold">+</span>
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
      </main>

      <div className="shrink-0 bg-white dark:bg-gray-900 px-6 pb-6 pt-4 border-t border-gray-100 dark:border-white/10">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Résumé</h3>
        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 mb-4">
          <div className="flex justify-between text-sm font-bold dark:text-gray-300">
            <span className="text-gray-400 uppercase text-[10px] tracking-widest">Total à payer</span>
            <span>{total.toFixed(2)} CHF</span>
          </div>
        </div>
        <div className="rounded-3xl p-1 border border-gray-100 dark:border-white/10">
          <button
            disabled={groupedList.length === 0}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.1em] transition-all
              ${groupedList.length === 0
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:brightness-105 active:scale-[0.98]'
              }`}
          >
            {groupedList.length === 0 ? 'Panier vide' : `Payer ${total.toFixed(2)} CHF`}
          </button>
        </div>
      </div>

    </div>
  );
}