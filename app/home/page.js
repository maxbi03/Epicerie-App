'use client';

import { STORE_LAT, STORE_LNG, DOOR_UNLOCK_RADIUS_M } from '../lib/config';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MapPin, Lock, DoorOpen, Camera, Package, ArrowRight, Loader2, CheckCircle2, Phone } from 'lucide-react';

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

  const doorIcon = doorStatus === 'success'
    ? <CheckCircle2 size={28} className="text-green-500" />
    : doorStatus === 'locating' || doorStatus === 'unlocking'
    ? <Loader2 size={28} className="text-amber-500 animate-spin" />
    : isNearby && phoneVerified
    ? <DoorOpen size={28} className="text-primary" />
    : <MapPin size={28} className="text-text-muted" />;

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

  return (
    <main className="h-full max-w-md mx-auto w-full flex flex-col px-4 pt-3 pb-3 overflow-hidden">

      {/* Salutation */}
      <div className="shrink-0 mb-3">
        <h1 className="text-xl font-bold text-text-primary leading-tight">
          Bonjour, {greeting} !
        </h1>
        <p className="text-xs text-text-muted">Bienvenue dans votre épicerie autonome.</p>
      </div>

      {/* Zone 60 / 20 / 20 — pas de trous */}
      <div className="flex-1 min-h-0 flex flex-col gap-3">

        {/* 60% — CARTE PORTE */}
        <div className={`flex-[3] min-h-0 bg-card-bg rounded-3xl border flex flex-col items-center justify-center text-center px-4 gap-3 transition-all duration-500 ${
          doorStatus === 'success' ? 'border-green-300 bg-green-50/50' :
          doorStatus === 'error' || doorStatus === 'too_far' || doorStatus === 'no_phone' ? 'border-red-200 bg-red-50/30' :
          isNearby && phoneVerified ? 'border-primary/30 bg-primary/5' :
          'border-border-light'
        }`}>
          <div className={`size-12 rounded-full flex items-center justify-center border transition-all duration-500 ${
            doorStatus === 'success' ? 'bg-green-100 border-green-300' :
            doorStatus === 'locating' || doorStatus === 'unlocking' ? 'bg-amber-100 border-amber-300 animate-pulse' :
            isNearby && phoneVerified ? 'bg-primary/10 border-primary/30' :
            'bg-app-bg border-border'
          }`}>
            {doorIcon}
          </div>

          <div>
            <h2 className="text-text-primary text-base font-bold mb-0.5">{doorTitle}</h2>
            <p className="text-text-muted text-sm">{doorSubtitle}</p>
          </div>

          {!isVisitor ? (
            <button
              onClick={handleUnlock}
              disabled={!canUnlock || doorStatus === 'locating' || doorStatus === 'unlocking' || doorStatus === 'success'}
              className={`w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] ${
                doorStatus === 'success' ? 'bg-green-500 text-white' :
                canUnlock && doorStatus !== 'locating' && doorStatus !== 'unlocking'
                  ? 'bg-primary text-white'
                  : 'opacity-60 bg-app-bg cursor-not-allowed'
              }`}
            >
              {doorStatus === 'success' ? <CheckCircle2 size={20} /> :
               doorStatus === 'locating' || doorStatus === 'unlocking' ? <Loader2 size={20} className="animate-spin" /> :
               canUnlock ? <DoorOpen size={20} /> :
               !phoneVerified ? <Phone size={20} className="text-text-muted" /> :
               <Lock size={20} className="text-text-muted" />}
              <span className={`font-bold text-sm uppercase tracking-wider ${
                doorStatus === 'success' || (canUnlock && doorStatus !== 'locating' && doorStatus !== 'unlocking') ? '' : 'text-text-muted'
              }`}>
                {doorStatus === 'success' ? 'Confirmé' :
                 doorStatus === 'locating' ? 'Localisation...' :
                 doorStatus === 'unlocking' ? 'Confirmation...' :
                 !phoneVerified ? 'Tél. non vérifié' :
                 !isNearby ? 'Trop loin' :
                 'Déverrouiller'}
              </span>
            </button>
          ) : (
            <div className="w-full space-y-2">
              <button disabled className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 opacity-50 bg-app-bg cursor-not-allowed">
                <Lock size={20} className="text-text-muted" />
                <span className="text-text-muted font-bold text-sm uppercase tracking-wider">Compte requis</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/" className="py-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all">
                  Se connecter
                </Link>
                <Link href="/" className="py-3 rounded-xl bg-primary-light text-primary font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all">
                  Créer un compte
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 20% — RACCOURCIS */}
        <div className="flex-[1] min-h-0 grid grid-cols-2 gap-3">
          <Link href="/scanner" className="h-full flex items-center gap-3 bg-card-bg rounded-2xl px-4 border border-border-light active:scale-[0.98] transition-all">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Camera size={18} className="text-primary" />
            </div>
            <span className="font-bold text-sm text-text-primary">Scanner</span>
          </Link>
          <Link href="/stock" className="h-full flex items-center gap-3 bg-card-bg rounded-2xl px-4 border border-border-light active:scale-[0.98] transition-all">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Package size={18} className="text-primary" />
            </div>
            <span className="font-bold text-sm text-text-primary">Produits</span>
          </Link>
        </div>

        {/* 20% — DERNIÈRE ACTUALITÉ */}
        {latestNews ? (
          <Link href="/news" className="flex-[1] min-h-0 flex items-center bg-card-bg rounded-2xl border border-border-light overflow-hidden active:scale-[0.98] transition-all">
            {latestNews.image1
              ? <img src={latestNews.image1} className="h-full w-20 object-cover shrink-0" alt="" />
              : <div className="h-full w-16 bg-primary/10 flex items-center justify-center shrink-0">
                  <Package size={20} className="text-primary/40" />
                </div>
            }
            <div className="flex-1 min-w-0 px-3">
              <span className={`text-[9px] font-black uppercase tracking-widest ${
                latestNews.category === 'offres' ? 'text-green-600' :
                latestNews.category === 'partenaires' ? 'text-green-600' :
                'text-blue-500'
              }`}>
                {latestNews.category === 'offres' ? 'Offre' : latestNews.category === 'partenaires' ? 'Partenaire' : 'Info'}
              </span>
              <p className="font-bold text-sm text-text-primary truncate">{latestNews.title}</p>
              {latestNews.subtitle && (
                <p className="text-xs text-text-muted truncate">{latestNews.subtitle}</p>
              )}
            </div>
            <ArrowRight size={14} className="text-text-muted shrink-0 mr-3" />
          </Link>
        ) : (
          /* Placeholder si pas de news — maintient la proportion 20% */
          <div className="flex-[1] min-h-0 bg-card-bg rounded-2xl border border-border-light" />
        )}

      </div>
    </main>
  );
}
