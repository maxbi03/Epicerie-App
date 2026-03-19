'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ConfirmationPage() {
  useEffect(() => {
    // Clear the cart after successful payment
    localStorage.removeItem('user_basket');
    window.dispatchEvent(new Event('cart-updated'));
  }, []);

  return (
    <div className="relative flex h-screen max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-x border-gray-200 dark:border-white/10">
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
        <div className="size-24 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
          <span className="text-5xl">✅</span>
        </div>
        <h1 className="text-2xl font-black text-green-900 dark:text-white mb-2">
          Paiement confirmé !
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px]">
          Merci pour votre achat. Votre commande a été enregistrée avec succès.
        </p>

        <div className="mt-10 flex flex-col gap-3 w-full max-w-[240px]">
          <Link
            href="/home"
            className="w-full py-4 rounded-2xl bg-green-600 text-white font-black text-sm uppercase tracking-[0.1em] text-center hover:brightness-105 active:scale-[0.98] transition-all"
          >
            Retour à l'accueil
          </Link>
          <Link
            href="/scanner"
            className="w-full py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-green-900 dark:text-white font-bold text-xs uppercase tracking-widest text-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Scanner d'autres produits
          </Link>
        </div>
      </div>
    </div>
  );
}
