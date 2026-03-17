'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';

export default function ScannerPage() {
  const [isVisitor, setIsVisitor] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);
  const isScanning = useRef(false);

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
    updateCartSummary();
  }, []);

  function updateCartSummary() {
    const basket = JSON.parse(localStorage.getItem('user_basket') || '[]');
    setCartCount(basket.length);
    const total = basket.reduce((sum, p) => sum + (p.price || 0), 0);
    setCartTotal(total.toFixed(2));
  }

  function initScanner() {
    if (isVisitor || !window.Html5Qrcode || scannerRef.current) return;

    const html5QrCode = new window.Html5Qrcode('reader');
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        if (isScanning.current) return;
        isScanning.current = true;
        handleScanSuccess(decodedText);
        setTimeout(() => { isScanning.current = false; }, 3000);
      },
      () => {}
    ).catch(() => alert("Impossible d'accéder à la caméra. Vérifiez les permissions."));
  }

  function handleScanSuccess(barcode) {
    const products = JSON.parse(localStorage.getItem('products_cache') || '[]');
    const product = products.find(p => String(p.barcode) === String(barcode));
    if (product) {
      if (navigator.vibrate) navigator.vibrate(100);
      addToBasket(product);
    } else {
      alert('Produit non trouvé dans la base de données.');
    }
  }

  function addToBasket(product) {
    const basket = JSON.parse(localStorage.getItem('user_basket') || '[]');
    basket.push(product);
    localStorage.setItem('user_basket', JSON.stringify(basket));
    updateCartSummary();
  }

  function submitManualBarcode() {
    if (barcodeInput.length === 13) {
      handleScanSuccess(barcodeInput);
      setBarcodeInput('');
      setManualOpen(false);
    } else {
      alert('Le code-barres doit contenir exactement 13 chiffres.');
    }
  }

  if (isVisitor) return (
    <div className="relative h-screen max-w-md mx-auto bg-black shadow-2xl overflow-hidden flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-2xl border border-gray-100 dark:border-white/10 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-lg font-black text-green-900 dark:text-white mb-2">Scanner désactivé</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Créez un compte et vérifiez-le pour utiliser cette fonctionnalité.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/" className="w-full py-4 rounded-2xl bg-green-600 text-white font-black text-xs uppercase tracking-widest text-center">
            Se connecter
          </Link>
          <Link href="/" className="w-full py-4 rounded-2xl bg-green-100 text-green-700 font-black text-xs uppercase tracking-widest text-center">
            Créer un compte
          </Link>
        </div>
        <Link href="/home" className="block mt-5 text-xs font-bold text-gray-400 hover:text-gray-500">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <Script
        src="https://unpkg.com/html5-qrcode"
        onLoad={() => {
          setScannerReady(true);
          initScanner();
        }}
      />

      <div className="relative h-screen max-w-md mx-auto bg-black shadow-2xl overflow-hidden">

        <div className="absolute inset-0 z-0">
          <div id="reader" className="w-full h-full opacity-90" />
        </div>

        <div className="absolute inset-0 z-10 flex flex-col">

          <div className="flex-1 bg-black/50" />

          <div className="relative h-64 w-full flex justify-center items-center bg-transparent">
            <div className="relative w-full h-full mx-10">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-400" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-400" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-400" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-400" />
            </div>
          </div>

          <div className="flex-[1.5] bg-black/50 flex flex-col items-center px-10 text-center">
            <p className="text-white text-sm font-medium leading-relaxed mt-8">
              Alignez le code-barres de l'article dans le rectangle vert.
            </p>

            <button
              onClick={() => setManualOpen(o => !o)}
              className="mt-8 flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-xs font-bold uppercase tracking-widest active:scale-95 transition-all"
            >
              ⌨️ Saisie manuelle
            </button>

            {manualOpen && (
              <div className="mt-4 w-full max-w-xs bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                <p className="text-white text-sm mb-2">Entrez le code-barres (13 chiffres) :</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={13}
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-2 rounded-lg text-center text-lg font-bold bg-white/20 border border-white/30 text-white placeholder-white/50"
                  placeholder="1234567890123"
                />
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {['1','2','3','4','5','6','7','8','9','0'].map(n => (
                    <button
                      key={n}
                      onClick={() => setBarcodeInput(v => v.length < 13 ? v + n : v)}
                      className="py-3 text-xl font-bold rounded-lg bg-white text-green-900 active:bg-green-400"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setBarcodeInput(v => v.slice(0, -1))}
                    className="py-3 text-xl font-bold rounded-lg bg-white text-green-900 active:bg-green-400"
                  >
                    ⌫
                  </button>
                  <button
                    onClick={submitManualBarcode}
                    className="col-span-2 py-3 text-sm font-black rounded-lg bg-green-400 text-green-900 uppercase tracking-widest active:scale-95"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}

            <div className="mt-12 mb-32 w-full">
              <Link href="/panier" className="flex items-center justify-between bg-green-400 p-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3 text-green-900">
                  <div className="relative">
                    <span className="text-xl">🛒</span>
                    <span className="absolute -top-2 -right-2 bg-white text-[10px] font-black px-1.5 rounded-full border border-green-400">
                      {cartCount}
                    </span>
                  </div>
                  <span className="font-bold text-sm">Voir mon panier</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-green-900/60 uppercase">Total:</span>
                  <span className="font-black text-green-900">{cartTotal} CHF</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}