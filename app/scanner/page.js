'use client';

import { fetchProducts } from '../lib/productsService';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';

function validateEAN13(barcode) {
  return /^\d{13}$/.test(barcode);
}

export default function ScannerPage() {
  const [isVisitor, setIsVisitor] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const scannerRef = useRef(null);
  const isScanning = useRef(false);

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
    updateCartSummary();

    // Load products into cache for barcode matching
    fetchProducts().then(products => {
      localStorage.setItem('products_cache', JSON.stringify(products));
      console.log('Products cache refreshed:', products.length, 'products');
    }).catch(err => console.error('Failed to load products:', err));
  }, []);

  function updateCartSummary() {
    const basket = JSON.parse(localStorage.getItem('user_basket') || '[]');
    setCartCount(basket.length);
    const total = basket.reduce((sum, p) => sum + (p.price || 0), 0);
    setCartTotal(total.toFixed(2));
  }

  function showFeedback(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 2500);
  }

  function initScanner() {
    if (!window.Html5Qrcode || scannerRef.current) return;
    const html5QrCode = new window.Html5Qrcode('reader');
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 320, height: 150 },
        disableFlip: false,
      },
      (decodedText) => {
        // Ignore anything that's not 13 digits
        if (!/^\d{13}$/.test(decodedText)) return;
        if (isScanning.current) return;
        isScanning.current = true;
        try {
          handleScanSuccess(decodedText);
        } catch (e) {
          console.error('Scan error:', e);
        }
        setTimeout(() => { isScanning.current = false; }, 1500);
      },
      () => {}
    ).catch(() => showFeedback('error', "Impossible d'accéder à la caméra."));
  }

  function handleScanSuccess(barcode) {
    console.log('Scanned barcode:', barcode, 'length:', barcode.length);

    if (!validateEAN13(barcode)) {
      console.log('EAN13 validation failed for:', barcode);
      showFeedback('error', `Code-barres invalide: ${barcode}`);
      return;
    }

    const products = JSON.parse(localStorage.getItem('products_cache') || '[]');
    console.log('Products in cache:', products.length);
    console.log('Barcodes in cache:', products.map(p => p.barcode).filter(Boolean));

    const product = products.find(p => String(p.barcode) === String(barcode));
    if (product) {
      if (navigator.vibrate) navigator.vibrate(100);
      addToBasket(product);
      showFeedback('success', `✓ ${product.name} ajouté !`);
    } else {
      showFeedback('error', `Produit non trouvé pour: ${barcode}`);
    }
  }

  function addToBasket(product) {
    const basket = JSON.parse(localStorage.getItem('user_basket') || '[]');
    basket.push(product);
    localStorage.setItem('user_basket', JSON.stringify(basket));
    updateCartSummary();
    window.dispatchEvent(new Event('cart-updated'));
  }

  function submitManualBarcode() {
    if (barcodeInput.length === 13) {
      handleScanSuccess(barcodeInput);
      setBarcodeInput('');
      setManualOpen(false);
    } else {
      showFeedback('error', 'Le code doit contenir 13 chiffres.');
    }
  }

  if (isVisitor) return (
    <div className="h-[calc(100vh-73px)] max-w-md mx-auto bg-black flex items-center justify-center px-6">
      <div className="w-full bg-card-bg rounded-[2rem] p-6 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-primary-light flex items-center justify-center mb-4 text-3xl">🔒</div>
        <h2 className="text-lg font-black text-text-primary mb-2">Scanner désactivé</h2>
        <p className="text-sm text-text-secondary leading-relaxed mb-6">Créez un compte pour utiliser cette fonctionnalité.</p>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/" className="py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest text-center">Se connecter</Link>
          <Link href="/" className="py-4 rounded-2xl bg-primary-light text-forest-green font-black text-xs uppercase tracking-widest text-center">Créer un compte</Link>
        </div>
        <Link href="/home" className="block mt-5 text-xs font-bold text-text-muted">Retour à l'accueil</Link>
      </div>
    </div>
  );

  return (
    <>
      <Script src="https://unpkg.com/html5-qrcode" onLoad={initScanner} />

      <style>{`
        #reader { border: none !important; }
        #reader video { border-radius: 16px; }
        #reader__scan_region { background: transparent !important; }
        #reader__dashboard { display: none !important; }
        #reader__header_message { display: none !important; }
        #reader img { display: none !important; }
        #reader__scan_region img { display: none !important; }
        #reader video { border-radius: 0px; height: 100% !important; width: 100% !important; object-fit: cover !important; }
      `}</style>

      <div className="h-[calc(100vh-73px)] max-w-md mx-auto bg-gray-950 flex flex-col overflow-hidden">

        {/* Zone caméra — prend 55% de l'écran */}
        <div className="relative flex-[6] overflow-hidden pt-30">
          <div id="reader" className="w-full h-full" />

          {/* Feedback message */}
          {feedback && (
            <div className={`absolute bottom-3 left-4 right-4 px-4 py-3 rounded-2xl text-sm font-bold text-center z-20 ${
              feedback.type === 'success' ? 'bg-primary text-white' :
              feedback.type === 'warn' ? 'bg-amber-400 text-amber-900' :
              'bg-red-500 text-white'
            }`}>
              {feedback.message}
            </div>
          )}
        </div>

        {/* Zone contrôles — prend 44.5% de l'écran */}
        <div className="flex-[4.5] flex flex-col justify-between px-5 py-4 bg-gray-950">

          <p className="text-white/50 text-xs text-center">
            Alignez le code-barres dans le cadre
          </p>

          {/* Saisie manuelle */}
          {manualOpen && (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
              <input
                type="text"
                inputMode="numeric"
                maxLength={13}
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 rounded-xl text-center text-lg font-bold bg-white/20 border border-white/30 text-white placeholder-white/40 mb-3"
                placeholder="2000000000000"
                autoFocus
              />
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','0'].map(n => (
                  <button
                    key={n}
                    onClick={() => setBarcodeInput(v => v.length < 13 ? v + n : v)}
                    className="py-2.5 text-lg font-bold rounded-xl bg-white/20 text-white active:bg-primary transition-colors"
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setBarcodeInput(v => v.slice(0, -1))}
                  className="py-2.5 text-lg font-bold rounded-xl bg-white/10 text-white active:bg-white/20"
                >
                  ⌫
                </button>
                <button
                  onClick={submitManualBarcode}
                  className="col-span-2 py-2.5 text-sm font-black rounded-xl bg-primary text-white uppercase tracking-widest active:scale-95 transition-all"
                >
                  Valider
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setManualOpen(o => !o)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-white text-xs font-bold uppercase tracking-widest active:scale-95 transition-all"
            >
              ⌨️ {manualOpen ? 'Fermer la saisie' : 'Saisie manuelle'}
            </button>

            <Link
              href="/panier"
              className="flex items-center justify-between bg-primary px-5 py-4 rounded-2xl active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3 text-white">
                <div className="relative">
                  <span className="text-xl">🛒</span>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black px-1.5 rounded-full">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="font-bold text-sm">Voir mon panier</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white/60 uppercase">Total:</span>
                <span className="font-black text-white">{cartTotal} CHF</span>
              </div>
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}