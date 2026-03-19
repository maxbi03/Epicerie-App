'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ConfirmationPage() {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    async function verifyPayment() {
      const paymentId = localStorage.getItem('pending_payment_id');

      if (!paymentId) {
        // No payment ID — just show success (came from webhook flow)
        setStatus('success');
        clearCart();
        return;
      }

      try {
        const res = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId }),
        });
        const data = await res.json();

        if (data.status === 'paid') {
          setStatus('success');
          clearCart();
          localStorage.removeItem('pending_payment_id');
        } else {
          setStatus('pending');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
      }
    }

    verifyPayment();
  }, []);

  function clearCart() {
    localStorage.removeItem('user_basket');
    window.dispatchEvent(new Event('cart-updated'));
  }

  if (status === 'loading') {
    return (
      <div className="relative flex h-screen max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-x border-gray-200 dark:border-white/10">
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="size-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-6"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="relative flex h-screen max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-x border-gray-200 dark:border-white/10">
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="size-24 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl">⏳</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Paiement en cours</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px]">
            Votre paiement n'a pas encore été confirmé. Veuillez patienter ou réessayer.
          </p>
          <Link href="/panier" className="mt-8 py-4 px-8 rounded-2xl bg-green-600 text-white font-black text-sm uppercase tracking-[0.1em] hover:brightness-105 active:scale-[0.98] transition-all">
            Retour au panier
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="relative flex h-screen max-w-md mx-auto flex-col bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border-x border-gray-200 dark:border-white/10">
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="size-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <span className="text-5xl">❌</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Erreur</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-[260px]">
            Impossible de vérifier votre paiement. Contactez le support si le problème persiste.
          </p>
          <Link href="/panier" className="mt-8 py-4 px-8 rounded-2xl bg-green-600 text-white font-black text-sm uppercase tracking-[0.1em] hover:brightness-105 active:scale-[0.98] transition-all">
            Retour au panier
          </Link>
        </div>
      </div>
    );
  }

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
          Merci pour votre achat. Les stocks ont été mis à jour automatiquement.
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
