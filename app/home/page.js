'use client';

import { STORE_LAT, STORE_LNG, DOOR_UNLOCK_RADIUS_M } from '../lib/config';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Lock, DoorOpen, Camera, Package, ChevronRight, Loader2, CheckCircle2, Phone, Newspaper, Flag, X, Send, ShoppingBasket, Trash2, Wind, HelpCircle, Wrench } from 'lucide-react';

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function HomePage() {
  const [isVisitor, setIsVisitor] = useState(false);
  const [greeting, setGreeting] = useState('…');
  const [latestNews, setLatestNews] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [doorStatus, setDoorStatus] = useState('idle'); // idle, locating, unlocking, waiting, success, error, too_far, no_phone
  const [doorError, setDoorError] = useState('');
  const [distance, setDistance] = useState(null);
  const [isNearby, setIsNearby] = useState(false);
  const lastCoords = useRef(null);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState(null);
  const [reportText, setReportText] = useState('');
  const [reportStatus, setReportStatus] = useState('idle'); // idle | sending | done | error
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
    if (visitor) { setGreeting('Visiteur'); return; }

    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.user) { setGreeting('Visiteur'); return; }
        if (data.user.name) setGreeting(data.user.name.split(' ')[0]);
        setPhoneVerified(!!data.user.phone_verified);
        setUserId(data.user.id);
      });

    fetch('/api/news')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setLatestNews(data[0]); })
      .catch(() => {});

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          lastCoords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const dist = haversine(pos.coords.latitude, pos.coords.longitude, STORE_LAT, STORE_LNG);
          setDistance(Math.round(dist));
          setIsNearby(dist <= DOOR_UNLOCK_RADIUS_M);
        },
        (err) => {
          if (err.code !== 1) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const dist = haversine(pos.coords.latitude, pos.coords.longitude, STORE_LAT, STORE_LNG);
                setDistance(Math.round(dist));
                setIsNearby(dist <= DOOR_UNLOCK_RADIUS_M);
              },
              () => {},
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
            );
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  async function handleUnlock() {
    if (!phoneVerified) { setDoorStatus('no_phone'); return; }
    setDoorStatus('locating');
    setDoorError('');
    try {
      const pos = lastCoords.current;
      if (!pos) {
        setDoorStatus('error');
        setDoorError('Position GPS non disponible. Autorisez la localisation et réessayez.');
        return;
      }
      const dist = haversine(pos.lat, pos.lng, STORE_LAT, STORE_LNG);
      setDistance(Math.round(dist));
      if (dist > DOOR_UNLOCK_RADIUS_M) {
        setDoorStatus('too_far');
        setDoorError(`${Math.round(dist)}m — rapprochez-vous (max ${DOOR_UNLOCK_RADIUS_M}m)`);
        return;
      }
      setDoorStatus('unlocking');
      const res = await fetch('/api/door/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pos),
      });
      const data = await res.json();
      if (!res.ok) { setDoorStatus('error'); setDoorError(data.error); return; }
      setDoorStatus(data.confirmed ? 'success' : 'error');
      if (!data.confirmed) setDoorError('Commande envoyée mais pas de confirmation');
      setTimeout(() => setDoorStatus('idle'), 6000);
    } catch (err) {
      setDoorStatus('error');
      setDoorError(err.message);
    }
  }

  const canUnlock = !isVisitor && phoneVerified && isNearby;

  const REPORT_TYPES = [
    { key: 'product_missing', label: 'Produit manquant', Icon: ShoppingBasket, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700' },
    { key: 'product_damaged', label: 'Produit abîmé / échu', Icon: Trash2, color: 'text-red-500', bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700' },
    { key: 'store_dirty',     label: 'Magasin sale', Icon: Wind, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-700' },
    { key: 'technical',       label: 'Problème technique', Icon: Wrench, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-700' },
    { key: 'other',           label: 'Autre problème', Icon: HelpCircle, color: 'text-text-muted', bg: 'bg-card-bg border-border-light' },
  ];

  function openReport() { setReportType(null); setReportText(''); setReportStatus('idle'); setShowReport(true); }

  async function handleReportSubmit() {
    if (!reportType) return;
    setReportStatus('sending');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: reportType, description: reportText, user_id: userId }),
      });
      if (!res.ok) throw new Error();
      setReportStatus('done');
      setTimeout(() => setShowReport(false), 1500);
    } catch {
      setReportStatus('error');
    }
  }

  const doorIcon = doorStatus === 'success'
    ? <CheckCircle2 size={32} className="text-green-500" />
    : doorStatus === 'locating' || doorStatus === 'unlocking'
    ? <Loader2 size={32} className="text-amber-500 animate-spin" />
    : isNearby && phoneVerified
    ? <DoorOpen size={32} className="text-primary" />
    : <MapPin size={32} className="text-text-muted" />;

  const doorTitle = doorStatus === 'success' ? 'Porte déverrouillée'
    : doorStatus === 'locating' ? 'Localisation...'
    : doorStatus === 'unlocking' ? 'Ouverture en cours...'
    : doorStatus === 'error' || doorStatus === 'too_far' ? 'Accès refusé'
    : doorStatus === 'no_phone' ? 'Téléphone non vérifié'
    : isNearby ? 'Épicerie détectée'
    : 'Aucun magasin à proximité';

  const doorSubtitle = doorStatus === 'success' ? 'La porte est ouverte pendant 5s'
    : doorStatus === 'unlocking' ? 'En attente de confirmation...'
    : doorStatus === 'error' || doorStatus === 'too_far' ? doorError
    : doorStatus === 'no_phone' ? 'Vérifiez votre numéro dans votre profil'
    : isNearby && phoneVerified ? `Vous êtes à ${distance ?? '?'}m`
    : distance != null ? `Vous êtes à ${distance}m de l'épicerie`
    : 'Recherche de votre position...';

  /* États dérivés pour la couleur de la carte */
  const doorState = doorStatus === 'success' ? 'success'
    : doorStatus === 'error' || doorStatus === 'too_far' || doorStatus === 'no_phone' ? 'error'
    : doorStatus === 'locating' || doorStatus === 'unlocking' ? 'loading'
    : isNearby && phoneVerified ? 'ready'
    : 'idle';

  const categoryColor = latestNews?.category === 'offres' ? 'bg-emerald-500'
    : latestNews?.category === 'partenaires' ? 'bg-violet-500'
    : 'bg-blue-500';
  const categoryLabel = latestNews?.category === 'offres' ? 'Offre'
    : latestNews?.category === 'partenaires' ? 'Partenaire' : 'Info';

  return (
    <>
    <main className="relative h-full max-w-md mx-auto w-full flex flex-col px-4 pt-4 pb-4 overflow-hidden">

      {/* ── Salutation ── */}
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl font-black text-text-primary leading-tight tracking-tight">
          Bonjour, {greeting} !
        </h1>
        <p className="text-xs text-text-muted mt-0.5">Bienvenue dans votre épicerie autonome.</p>
      </div>

      {/* ── Zone 60 / 20 / 20 ── */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">

        {/* ── 60% — PORTE ── */}
        <div className={`flex-[3] min-h-0 relative rounded-3xl overflow-hidden flex flex-col items-center justify-center text-center px-6 gap-5 transition-all duration-500 ${
          doorState === 'success' ? 'bg-emerald-50 border-2 border-emerald-300' :
          doorState === 'error'   ? 'bg-red-50 border-2 border-red-200' :
          doorState === 'loading' ? 'bg-amber-50 border-2 border-amber-200' :
          doorState === 'ready'   ? 'bg-primary/5 border-2 border-primary/40' :
          'bg-card-bg border border-border-light'
        }`}>

          {/* Glow décoratif en fond */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 ${
            doorState === 'success' ? 'bg-emerald-400' :
            doorState === 'error'   ? 'bg-red-400' :
            doorState === 'loading' ? 'bg-amber-400' :
            doorState === 'ready'   ? 'bg-primary' :
            'bg-transparent'
          }`} />

          {/* Icône avec halo */}
          <div className="relative flex items-center justify-center">
            {doorState === 'ready' && (
              <div className="absolute size-24 rounded-full bg-primary/10 animate-ping" style={{animationDuration:'2s'}} />
            )}
            <div className={`relative size-20 rounded-full flex items-center justify-center border-2 shadow-lg transition-all duration-500 ${
              doorState === 'success' ? 'bg-white border-emerald-300 shadow-emerald-100' :
              doorState === 'error'   ? 'bg-white border-red-200 shadow-red-100' :
              doorState === 'loading' ? 'bg-white border-amber-300 shadow-amber-100' :
              doorState === 'ready'   ? 'bg-white border-primary/30 shadow-primary/10' :
              'bg-app-bg border-border-light shadow-none'
            }`}>
              {doorIcon}
            </div>
          </div>

          {/* Texte */}
          <div className="space-y-1">
            <h2 className="text-text-primary text-lg font-black tracking-tight">{doorTitle}</h2>
            <p className="text-text-muted text-sm leading-snug">{doorSubtitle}</p>
          </div>

          {/* Bouton principal */}
          {!isVisitor ? (
            <button
              onClick={handleUnlock}
              disabled={!canUnlock || doorStatus === 'locating' || doorStatus === 'unlocking' || doorStatus === 'success'}
              className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 font-black text-sm uppercase tracking-widest transition-all active:scale-[0.97] ${
                doorState === 'success'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : doorState === 'ready'
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'bg-app-bg text-text-muted border border-border-light cursor-not-allowed opacity-70'
              }`}
            >
              {doorStatus === 'success'   ? <CheckCircle2 size={18} /> :
               doorState === 'loading'    ? <Loader2 size={18} className="animate-spin" /> :
               doorState === 'ready'      ? <DoorOpen size={18} /> :
               !phoneVerified             ? <Phone size={18} /> :
                                            <Lock size={18} />}
              {doorStatus === 'success'             ? 'Porte ouverte !' :
               doorStatus === 'locating'            ? 'Localisation…' :
               doorStatus === 'unlocking'           ? 'Ouverture…' :
               doorStatus === 'no_phone'            ? 'Tél. non vérifié' :
               !isNearby                            ? 'Trop loin' :
                                                      'Déverrouiller'}
            </button>
          ) : (
            <div className="w-full space-y-2">
              <p className="text-xs text-text-muted">Créez un compte pour accéder à l&apos;épicerie</p>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/" className="py-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all">
                  Se connecter
                </Link>
                <Link href="/" className="py-3 rounded-xl bg-primary-light text-primary font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all border border-primary/20">
                  Créer un compte
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── 20% — RACCOURCIS ── */}
        <div className="flex-[1] min-h-0 grid grid-cols-2 gap-3">
          <Link href="/scanner" className="h-full flex flex-col items-center justify-center gap-1.5 bg-card-bg rounded-2xl border border-border-light active:scale-[0.97] transition-all group">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-active:scale-95 transition-transform">
              <Camera size={20} className="text-primary" />
            </div>
            <span className="font-bold text-xs text-text-primary tracking-wide">Scanner</span>
          </Link>
          <Link href="/stock" className="h-full flex flex-col items-center justify-center gap-1.5 bg-card-bg rounded-2xl border border-border-light active:scale-[0.97] transition-all group">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-active:scale-95 transition-transform">
              <Package size={20} className="text-primary" />
            </div>
            <span className="font-bold text-xs text-text-primary tracking-wide">Produits</span>
          </Link>
        </div>

        {/* ── 20% — ACTUALITÉ ── */}
        {latestNews ? (
          <Link href="/news" className="flex-[1] min-h-0 flex items-center bg-card-bg rounded-2xl border border-border-light overflow-hidden active:scale-[0.98] transition-all">
            {latestNews.image1
              ? <img src={latestNews.image1} className="h-full w-24 object-cover shrink-0" alt="" />
              : <div className="h-full w-20 bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0">
                  <Newspaper size={22} className="text-primary/50" />
                </div>
            }
            <div className="flex-1 min-w-0 px-3.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`size-1.5 rounded-full shrink-0 ${categoryColor}`} />
                <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">{categoryLabel}</span>
              </div>
              <p className="font-bold text-sm text-text-primary truncate leading-tight">{latestNews.title}</p>
              {latestNews.subtitle && (
                <p className="text-xs text-text-muted truncate mt-0.5">{latestNews.subtitle}</p>
              )}
            </div>
            <ChevronRight size={16} className="text-text-muted shrink-0 mr-3" />
          </Link>
        ) : (
          <div className="flex-[1] min-h-0 rounded-2xl border border-border-light border-dashed bg-card-bg/50" />
        )}

      </div>

      {/* ── Bouton flottant Signaler ── */}
      <button
        onClick={openReport}
        className="absolute bottom-5 right-4 size-11 rounded-full bg-red-500 shadow-lg shadow-red-500/30 flex items-center justify-center text-white active:scale-90 transition-all z-10"
        aria-label="Signaler un problème"
      >
        <Flag size={16} />
      </button>
    </main>

    {/* ── Bottom sheet signalement ── */}
    {showReport && (
      <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => reportStatus !== 'sending' && setShowReport(false)}>
        <div className="bg-card-bg rounded-t-3xl w-full max-w-md overflow-y-auto max-h-[85vh] animate-slide-up" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border-light">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <Flag size={15} className="text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-text-primary">Signaler un problème</h2>
                <p className="text-[10px] text-text-muted">Votre retour nous aide à améliorer l'épicerie</p>
              </div>
            </div>
            <button onClick={() => setShowReport(false)} className="size-9 flex items-center justify-center rounded-full hover:bg-app-bg text-text-muted transition-colors">
              <X size={17} />
            </button>
          </div>

          <div className="px-5 pt-4 pb-6 space-y-4">
            {/* Type */}
            <div className="grid grid-cols-2 gap-2.5">
              {REPORT_TYPES.map(({ key, label, Icon, color, bg }) => (
                <button
                  key={key}
                  onClick={() => setReportType(key)}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all active:scale-[0.97] text-center ${
                    reportType === key
                      ? `${bg} ${color} border-current`
                      : 'bg-app-bg border-border-light text-text-muted hover:border-gray-300'
                  }`}
                >
                  <Icon size={22} className={reportType === key ? color : 'text-text-muted'} />
                  <span className="text-[11px] font-bold leading-tight">{label}</span>
                </button>
              ))}
            </div>

            {/* Détail libre */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1.5 block">
                Précision <span className="font-normal normal-case tracking-normal">(optionnel)</span>
              </label>
              <textarea
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                placeholder="Ex : le fromage en rayon central est périmé depuis hier…"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 bg-app-bg dark:bg-white/5 dark:text-white text-sm resize-none outline-none focus:border-primary transition-colors"
              />
            </div>

            {/* Erreur */}
            {reportStatus === 'error' && (
              <p className="text-xs text-red-500 text-center">Une erreur est survenue, réessayez.</p>
            )}

            {/* CTA */}
            <button
              onClick={handleReportSubmit}
              disabled={!reportType || reportStatus === 'sending' || reportStatus === 'done'}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${
                reportStatus === 'done'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
              }`}
            >
              {reportStatus === 'done' ? (
                <><CheckCircle2 size={16} /> Merci, signalement envoyé !</>
              ) : reportStatus === 'sending' ? (
                <><div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi…</>
              ) : (
                <><Send size={15} /> Envoyer le signalement</>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
