'use client';

import { fetchProducts } from '../lib/productsService';
import { getBasket, saveBasket } from '../lib/basket';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { Lock, Keyboard, Delete, ShoppingCart, X, Camera, RefreshCw, AlertTriangle } from 'lucide-react';
import ProductModal from '../components/ProductModal';

function validateEAN13(barcode) {
  return /^\d{13}$/.test(barcode);
}

// États de la caméra
// 'idle'       — en attente d'un tap utilisateur (page vient de s'ouvrir)
// 'requesting' — getUserMedia() en cours (dialog natif visible)
// 'active'     — caméra active, scan en cours
// 'denied'     — permission refusée
// 'error'      — autre erreur (pas de caméra, HTTP, etc.)
const CAM = { IDLE: 'idle', REQUESTING: 'requesting', ACTIVE: 'active', DENIED: 'denied', ERROR: 'error' };

export default function ScannerPage() {
  const [isVisitor, setIsVisitor]       = useState(false);
  const [camStatus, setCamStatus]       = useState(CAM.IDLE);
  const [camError, setCamError]         = useState('');
  const [scriptReady, setScriptReady]   = useState(false);
  const [manualOpen, setManualOpen]     = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [cartCount, setCartCount]       = useState(0);
  const [cartTotal, setCartTotal]       = useState(0);
  const [feedback, setFeedback]         = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity]         = useState(1);
  const [unknownBarcode, setUnknownBarcode]   = useState(null);

  const scannerRef = useRef(null);
  const isScanning = useRef(false);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
    if (visitor) return;

    updateCartSummary();
    fetchProducts()
      .then(products => localStorage.setItem('products_cache', JSON.stringify(products)))
      .catch(err => console.error('Failed to load products:', err));

    if (window.Html5Qrcode) {
      setScriptReady(true);
      tryAutoStart();   // script déjà chargé (retour sur la page)
    }

    return () => { stopScanner(); };
  }, []);

  function onScriptLoad() {
    setScriptReady(true);
    tryAutoStart();     // script vient de se charger pour la première fois
  }

  // ── Auto-start si permission déjà accordée ───────────────────────────────────

  async function tryAutoStart() {
    if (!navigator.permissions) {
      // Pas d'API Permissions → rester en IDLE, l'utilisateur tape le bouton
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      if (result.state === 'granted') {
        // Permission déjà accordée → pas besoin de geste utilisateur, démarrer directement
        activateCamera();
      } else if (result.state === 'denied') {
        setCamStatus(CAM.DENIED);
      }
      // 'prompt' → rester en IDLE, afficher le bouton
    } catch {
      // Le navigateur ne supporte pas la query 'camera' (iOS < 16, etc.)
      // → rester en IDLE pour garantir un geste utilisateur propre
    }
  }

  // ── Nettoyage complet du div#reader ─────────────────────────────────────────

  function clearReaderElement() {
    try {
      const el = document.getElementById('reader');
      if (el) el.innerHTML = '';
    } catch { /* ignore */ }
  }

  // ── Déclenchement caméra (DOIT être appelé dans un onClick direct) ───────────

  function activateCamera() {
    // Vérifier HTTPS (obligatoire sur mobile hors localhost)
    if (
      typeof window !== 'undefined' &&
      location.protocol !== 'https:' &&
      location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1'
    ) {
      setCamStatus(CAM.ERROR);
      setCamError('La caméra nécessite une connexion sécurisée (HTTPS). Accédez à l\'app via HTTPS.');
      return;
    }

    if (!window.Html5Qrcode) {
      setCamStatus(CAM.ERROR);
      setCamError('Le scanner n\'est pas encore chargé. Patientez quelques secondes et réessayez.');
      return;
    }

    if (scannerRef.current) return;

    // Nettoyer le div#reader des résidus d'une instance précédente
    clearReaderElement();

    setCamStatus(CAM.REQUESTING);
    setCamError('');

    // ─── Instanciation dans le fil synchrone du geste utilisateur ───
    let html5QrCode;
    try {
      const formats = window.Html5QrcodeSupportedFormats;
      const formatsToSupport = formats ? [
        formats.EAN_13, formats.EAN_8,
        formats.UPC_A,  formats.UPC_E,
        formats.CODE_128,
      ] : undefined;
      html5QrCode = new window.Html5Qrcode(
        'reader',
        formatsToSupport ? { formatsToSupport } : undefined
      );
    } catch (e) {
      setCamStatus(CAM.ERROR);
      setCamError('Erreur d\'initialisation du scanner. Rechargez la page.');
      return;
    }

    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 30,
        qrbox: (w, h) => ({
          width:  Math.min(w * 0.9, 500),
          height: Math.min(h * 0.45, 250),
        }),
        aspectRatio: 1.7777,
        disableFlip: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      },
      (decodedText) => {
        if (!/^\d{8,13}$/.test(decodedText)) return;
        if (isScanning.current) return;
        isScanning.current = true;
        try { handleScanSuccess(decodedText); } catch (e) { console.error(e); }
        setTimeout(() => { isScanning.current = false; }, 1500);
      },
      () => {}
    )
    .then(() => {
      setCamStatus(CAM.ACTIVE);
    })
    .catch((err) => {
      // Nettoyer proprement l'instance avant de la jeter
      try { html5QrCode.clear(); } catch { /* ignore */ }
      scannerRef.current = null;

      const msg = String(err ?? '').toLowerCase();
      console.error('[Scanner] start() error:', err);

      if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
        setCamStatus(CAM.DENIED);
      } else if (msg.includes('notfound') || msg.includes('devicenotfound') || msg.includes('no camera')) {
        setCamStatus(CAM.ERROR);
        setCamError('Aucune caméra détectée sur cet appareil.');
      } else if (msg.includes('inuse') || msg.includes('in use') || msg.includes('notreadable')) {
        setCamStatus(CAM.ERROR);
        setCamError('La caméra est utilisée par une autre application. Fermez-la et réessayez.');
      } else {
        setCamStatus(CAM.ERROR);
        setCamError(`Erreur : ${String(err).slice(0, 120)}`);
      }
    });
  }

  // ── Retry — remet en IDLE pour que l'utilisateur retape (geste propre) ───────

  function handleRetry() {
    // Nettoyer l'instance existante si présente
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (inst) {
      inst.stop().catch(() => {}).finally(() => {
        try { inst.clear(); } catch { /* ignore */ }
        clearReaderElement();
      });
    } else {
      clearReaderElement();
    }
    setCamStatus(CAM.IDLE);
    setCamError('');
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* déjà stoppé */ }
      scannerRef.current = null;
    }
  }

  // ── Logique produits ─────────────────────────────────────────────────────────

  function updateCartSummary() {
    const basket = getBasket();
    setCartCount(basket.length);
    setCartTotal(basket.reduce((sum, p) => sum + (p.price || 0), 0).toFixed(2));
  }

  function showFeedback(type, message) {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 2500);
  }

  function handleScanSuccess(barcode) {
    if (!validateEAN13(barcode)) {
      showFeedback('error', `Code-barres invalide: ${barcode}`);
      return;
    }
    const products = JSON.parse(localStorage.getItem('products_cache') || '[]');
    const product  = products.find(p => String(p.barcode) === String(barcode));
    if (product) {
      if (navigator.vibrate) navigator.vibrate(100);
      setQuantity(1);
      setSelectedProduct(product);
      setUnknownBarcode(null);
    } else {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setUnknownBarcode(barcode);
      setTimeout(() => setUnknownBarcode(null), 5000);
    }
  }

  function addToBasket(product, qty) {
    const basket = getBasket();
    for (let i = 0; i < qty; i++) basket.push(product);
    saveBasket(basket);
    updateCartSummary();
  }

  function handleAddToCart(product, qty) {
    addToBasket(product, qty);
    showFeedback('success', `${qty}x ${product.name} ajouté !`);
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

  // ── Rendu mode visiteur ──────────────────────────────────────────────────────

  if (isVisitor) return (
    <div className="h-full max-w-md mx-auto bg-black flex items-center justify-center px-6">
      <div className="w-full bg-card-bg rounded-[2rem] p-6 text-center">
        <div className="mx-auto size-14 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
          <Lock size={28} className="text-primary" />
        </div>
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

  // ── Rendu principal ──────────────────────────────────────────────────────────

  const showOverlay = camStatus !== CAM.ACTIVE;

  return (
    <>
      <Script
        src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"
        onLoad={onScriptLoad}
      />

      <style>{`
        #reader { border: none !important; width: 100% !important; height: 100% !important; }
        #reader video { border-radius: 0px; width: 100% !important; height: 100% !important; object-fit: contain !important; }
        #reader__scan_region { background: transparent !important; width: 100% !important; height: 100% !important; }
        #reader__scan_region > div { box-shadow: 0 0 0 9999px rgba(0,0,0,0.5) !important; border: 2px solid rgba(255,255,255,0.6) !important; border-radius: 12px !important; }
        #reader__dashboard { display: none !important; }
        #reader__header_message { display: none !important; }
      `}</style>

      <div className="h-full bg-gray-950 flex flex-col overflow-hidden">

        {/* ── Zone caméra ── */}
        <div className="relative flex-1 overflow-hidden">

          {/* Overlay selon l'état */}
          {showOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 z-10 bg-gray-950">

              {/* IDLE — permission inconnue (prompt) ou après un retry */}
              {camStatus === CAM.IDLE && (
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="size-24 rounded-[2rem] bg-white/10 flex items-center justify-center">
                    <Camera size={44} className="text-white/80" />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-xl mb-2">Scanner un produit</h2>
                    <p className="text-white/50 text-sm leading-relaxed">
                      Appuyez pour activer la caméra.<br />
                      <span className="text-white/30 text-xs">Votre navigateur vous demandera l'autorisation.</span>
                    </p>
                  </div>
                  <button
                    onClick={activateCamera}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-primary/30"
                  >
                    <Camera size={18} /> Activer la caméra
                  </button>
                  {camError && (
                    <p className="text-amber-400 text-xs text-center px-4 mt-1">{camError}</p>
                  )}
                </div>
              )}

              {/* REQUESTING — dialog natif en cours */}
              {camStatus === CAM.REQUESTING && (
                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <div>
                    <h2 className="text-white font-black text-lg mb-2">Autorisation en cours…</h2>
                    <p className="text-white/50 text-sm leading-relaxed">
                      Acceptez la demande d'accès à la caméra dans la fenêtre qui s'affiche.
                    </p>
                  </div>
                </div>
              )}

              {/* DENIED — permission refusée */}
              {camStatus === CAM.DENIED && (
                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="size-20 rounded-[2rem] bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle size={36} className="text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-lg mb-2">Caméra bloquée</h2>
                    <p className="text-white/50 text-sm mb-4 leading-relaxed">
                      La permission a été refusée. Pour la réactiver :
                    </p>
                    <ol className="text-left text-white/40 text-xs space-y-2">
                      <li>① Appuyez sur l'icône 🔒 dans la barre d'adresse</li>
                      <li>② Trouvez <strong className="text-white/70">Caméra</strong> dans les permissions</li>
                      <li>③ Choisissez <strong className="text-white/70">Autoriser</strong></li>
                      <li>④ Rechargez la page, puis réessayez</li>
                    </ol>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-white/15 border border-white/20 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all"
                  >
                    <RefreshCw size={16} /> J'ai autorisé — réessayer
                  </button>
                </div>
              )}

              {/* ERROR — autre erreur */}
              {camStatus === CAM.ERROR && (
                <div className="flex flex-col items-center gap-5 text-center">
                  <div className="size-20 rounded-[2rem] bg-orange-500/20 flex items-center justify-center">
                    <AlertTriangle size={36} className="text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-black text-lg mb-2">Erreur caméra</h2>
                    <p className="text-white/50 text-sm leading-relaxed">
                      {camError || "Impossible d'accéder à la caméra."}
                    </p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 px-6 py-3 bg-white/15 border border-white/20 text-white rounded-2xl font-bold text-sm active:scale-95 transition-all"
                  >
                    <RefreshCw size={16} /> Réessayer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lecteur QR — toujours dans le DOM, caché jusqu'à l'activation */}
          <div
            id="reader"
            className="w-full h-full"
            style={{ visibility: camStatus === CAM.ACTIVE ? 'visible' : 'hidden' }}
          />

          {/* Feedback scan (succès / erreur) */}
          {feedback && camStatus === CAM.ACTIVE && (
            <div className={`absolute bottom-3 left-4 right-4 px-4 py-3 rounded-2xl text-sm font-bold text-center z-20 ${
              feedback.type === 'success' ? 'bg-primary text-white' :
              feedback.type === 'warn'    ? 'bg-amber-400 text-amber-900' :
                                           'bg-red-500 text-white'
            }`}>
              {feedback.message}
            </div>
          )}
        </div>

        {/* ── Zone contrôles ── */}
        <div className="shrink-0 flex flex-col gap-3 px-5 py-4 bg-gray-950">
          {unknownBarcode ? (
            <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
              <div className="size-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                <span className="text-lg">?</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-300">Produit non référencé</p>
                <p className="text-xs text-red-300/70 mt-0.5 font-mono">{unknownBarcode}</p>
                <p className="text-xs text-white/50 mt-1">Ce code-barres ne correspond à aucun produit en magasin.</p>
              </div>
              <button onClick={() => setUnknownBarcode(null)} className="text-white/40 hover:text-white shrink-0">
                <X size={16} />
              </button>
            </div>
          ) : (
            <p className="text-white/50 text-xs text-center">
              {camStatus === CAM.ACTIVE ? 'Alignez le code-barres dans le cadre' : '\u00A0'}
            </p>
          )}

          <div className="space-y-3">

            {manualOpen && (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-3">
                <div className="w-full p-3 rounded-xl text-center text-lg font-bold bg-white/20 border border-white/30 text-white min-h-[50px] flex items-center justify-center select-none">
                  {barcodeInput
                    ? <span className="tracking-[0.15em]">{barcodeInput}<span className="animate-pulse">|</span></span>
                    : <span className="text-white/40">_____________</span>
                  }
                </div>
                <p className="text-center text-[10px] text-white/40 font-bold">{barcodeInput.length}/13 chiffres</p>
                <div className="grid grid-cols-3 gap-2">
                  {['1','2','3','4','5','6','7','8','9'].map(n => (
                    <button key={n}
                      onClick={() => setBarcodeInput(v => v.length < 13 ? v + n : v)}
                      className="py-3.5 text-lg font-bold rounded-xl bg-white/20 text-white active:bg-primary transition-colors"
                    >{n}</button>
                  ))}
                  <button
                    onClick={() => setBarcodeInput(v => v.slice(0, -1))}
                    className="py-3.5 rounded-xl bg-red-500/30 text-red-300 active:bg-red-500/50 flex items-center justify-center"
                  ><Delete size={18} /></button>
                  <button
                    onClick={() => setBarcodeInput(v => v.length < 13 ? v + '0' : v)}
                    className="py-3.5 text-lg font-bold rounded-xl bg-white/20 text-white active:bg-primary transition-colors"
                  >0</button>
                  <button
                    onClick={submitManualBarcode}
                    disabled={barcodeInput.length !== 13}
                    className="py-3.5 text-sm font-black rounded-xl bg-primary text-white uppercase tracking-widest active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
                  >OK</button>
                </div>
              </div>
            )}

            <button
              onClick={() => setManualOpen(o => !o)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-white text-xs font-bold uppercase tracking-widest active:scale-95 transition-all"
            >
              <Keyboard size={16} /> {manualOpen ? 'Fermer la saisie' : 'Saisie manuelle'}
            </button>
          </div>
        </div>
      </div>

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAdd={handleAddToCart} />
    </>
  );
}
