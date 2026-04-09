'use client';

import { STORE_LAT, STORE_LNG, DOOR_UNLOCK_RADIUS_M } from '../lib/config';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AlertTriangle, MapPin, Lock, DoorOpen, Camera, Package, ArrowRight, Loader2, CheckCircle2, Phone } from 'lucide-react';

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
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [latestNews, setLatestNews] = useState(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [doorStatus, setDoorStatus] = useState('idle'); // idle, locating, unlocking, success, error, too_far, no_phone
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

    // Vérifier la proximité en continu
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          lastCoords.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const dist = haversine(pos.coords.latitude, pos.coords.longitude, STORE_LAT, STORE_LNG);
          setDistance(Math.round(dist));
          setIsNearby(dist <= DOOR_UNLOCK_RADIUS_M);
        },
        (err) => {
          console.log('Geolocation error:', err.code, err.message);
          // code 1 = PERMISSION_DENIED, essayer sans haute précision
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
    if (!phoneVerified) {
      setDoorStatus('no_phone');
      return;
    }

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
      if (!res.ok) {
        setDoorStatus('error');
        setDoorError(data.error);
        return;
      }

      setDoorStatus('success');
      setTimeout(() => setDoorStatus('idle'), 6000);

    } catch (err) {
      setDoorStatus('error');
      setDoorError(err.message);
    }
  }

  // Déterminer l'état visuel de la carte porte
  const canUnlock = !isVisitor && phoneVerified && isNearby;
  const doorIcon = doorStatus === 'success' ? <CheckCircle2 size={32} className="text-green-500" />
    : doorStatus === 'locating' || doorStatus === 'unlocking' ? <Loader2 size={32} className="text-amber-500 animate-spin" />
    : isNearby && phoneVerified ? <DoorOpen size={32} className="text-primary" />
    : <MapPin size={32} className="text-text-muted" />;

  const doorTitle = doorStatus === 'success' ? 'Porte déverrouillée'
    : doorStatus === 'locating' ? 'Localisation...'
    : doorStatus === 'unlocking' ? 'Déverrouillage...'
    : doorStatus === 'error' || doorStatus === 'too_far' ? 'Accès refusé'
    : doorStatus === 'no_phone' ? 'Téléphone non vérifié'
    : isNearby ? 'Épicerie détectée'
    : 'Aucun magasin à proximité';

  const doorSubtitle = doorStatus === 'success' ? 'La porte est ouverte pendant 5 secondes'
    : doorStatus === 'error' || doorStatus === 'too_far' ? doorError
    : doorStatus === 'no_phone' ? 'Vérifiez votre numéro dans votre profil'
    : isNearby && phoneVerified ? `Vous êtes à ${distance ?? '?'}m`
    : distance != null ? `Vous êtes à ${distance}m de l'épicerie`
    : 'Recherche de votre position...';

  return (
    <>
      {emailUnverified && (
        <div className="max-w-md mx-auto w-full">
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">Email non confirmé</p>
              <p className="text-xs text-amber-600 mt-0.5">Vérifiez votre boîte mail et cliquez sur le lien de confirmation.</p>
            </div>
            <button className="text-xs font-black text-amber-600 whitespace-nowrap hover:text-amber-800 transition-colors shrink-0">
              Renvoyer
            </button>
          </div>
        </div>
      )}

      <main className="relative flex h-full max-w-md mx-auto flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-10">

          <div className="px-5 pt-6 pb-2">
            <h1 className="text-2xl font-bold text-text-primary">
              Bonjour, <span>{greeting}</span> !
            </h1>
            <p className="text-sm text-text-secondary">Bienvenue dans votre épicerie autonome.</p>
          </div>

          {/* CARD PORTE */}
          <div className="p-5">
            <div className={`bg-card-bg rounded-3xl p-6 flex flex-col items-center text-center relative border shadow-sm transition-all duration-500 ${
              doorStatus === 'success' ? 'border-green-300 bg-green-50/50' :
              doorStatus === 'error' || doorStatus === 'too_far' || doorStatus === 'no_phone' ? 'border-red-200 bg-red-50/30' :
              isNearby && phoneVerified ? 'border-primary/30 bg-primary/5' :
              'border-border-light'
            }`}>
              <div className="mb-6">
                <div className={`size-16 rounded-full flex items-center justify-center border transition-all duration-500 ${
                  doorStatus === 'success' ? 'bg-green-100 border-green-300' :
                  doorStatus === 'locating' || doorStatus === 'unlocking' ? 'bg-amber-100 border-amber-300 animate-pulse' :
                  isNearby && phoneVerified ? 'bg-primary/10 border-primary/30' :
                  'bg-app-bg border-border'
                }`}>
                  {doorIcon}
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-text-primary text-xl font-bold mb-1">{doorTitle}</h2>
                <p className="text-text-muted text-sm font-medium">{doorSubtitle}</p>
              </div>

              {!isVisitor ? (
                <button
                  onClick={handleUnlock}
                  disabled={!canUnlock || doorStatus === 'locating' || doorStatus === 'unlocking' || doorStatus === 'success'}
                  className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.97] ${
                    doorStatus === 'success' ? 'bg-green-500 text-white' :
                    canUnlock && doorStatus !== 'locating' && doorStatus !== 'unlocking'
                      ? 'bg-primary text-white active:scale-[0.97]'
                      : 'opacity-60 bg-app-bg cursor-not-allowed'
                  }`}
                >
                  {doorStatus === 'success' ? <CheckCircle2 size={24} /> :
                   doorStatus === 'locating' || doorStatus === 'unlocking' ? <Loader2 size={24} className="animate-spin" /> :
                   canUnlock ? <DoorOpen size={24} /> :
                   !phoneVerified ? <Phone size={24} className="text-text-muted" /> :
                   <Lock size={24} className="text-text-muted" />}
                  <span className={`font-bold text-lg uppercase tracking-wider ${
                    doorStatus === 'success' || (canUnlock && doorStatus !== 'locating' && doorStatus !== 'unlocking') ? '' : 'text-text-muted'
                  }`}>
                    {doorStatus === 'success' ? 'Ouvert' :
                     doorStatus === 'locating' ? 'Localisation...' :
                     doorStatus === 'unlocking' ? 'Ouverture...' :
                     !phoneVerified ? 'Tél. non vérifié' :
                     !isNearby ? 'Trop loin' :
                     'Déverrouiller'}
                  </span>
                </button>
              ) : (
                <>
                  <button disabled className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 opacity-60 bg-app-bg cursor-not-allowed">
                    <Lock size={24} className="text-text-muted" />
                    <span className="text-text-muted font-bold text-lg uppercase tracking-wider">Compte requis</span>
                  </button>
                  <div className="w-full mt-4 bg-primary-light border border-border-light rounded-2xl p-4 text-left">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 size-10 rounded-xl bg-primary-light flex items-center justify-center">
                        <Lock size={20} className="text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-text-primary">Déverrouillage désactivé</p>
                        <p className="text-xs text-text-secondary leading-relaxed mt-1">
                          Créez un compte et vérifiez-le pour utiliser cette fonctionnalité.
                        </p>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          <Link href="/" className="w-full py-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all">
                            Se connecter
                          </Link>
                          <Link href="/" className="w-full py-3 rounded-xl bg-primary-light text-forest-green font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all">
                            Créer un compte
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RACCOURCIS */}
          <div className="px-5 mb-6">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Raccourcis</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/scanner" className="flex items-center gap-3 bg-card-bg rounded-2xl p-4 border border-border-light shadow-sm active:scale-[0.98] transition-all">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Camera size={20} className="text-primary" />
                </div>
                <span className="font-bold text-sm text-text-primary">Scanner</span>
              </Link>
              <Link href="/stock" className="flex items-center gap-3 bg-card-bg rounded-2xl p-4 border border-border-light shadow-sm active:scale-[0.98] transition-all">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package size={20} className="text-primary" />
                </div>
                <span className="font-bold text-sm text-text-primary">Produits</span>
              </Link>
            </div>
          </div>

          {/* DERNIÈRE NEWS */}
          {latestNews && (
            <div className="px-5 mb-6">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Actualité</h3>
              <Link href="/news" className="block bg-card-bg rounded-2xl overflow-hidden shadow-sm border border-border-light active:scale-[0.98] transition-all">
                {latestNews.image1 && (
                  <img src={latestNews.image1} className="w-full h-36 object-cover" alt="" />
                )}
                <div className="p-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    latestNews.category === 'offres' ? 'text-green-600' :
                    latestNews.category === 'partenaires' ? 'text-green-600' :
                    'text-blue-500'
                  }`}>{latestNews.category === 'offres' ? 'Offre' : latestNews.category === 'partenaires' ? 'Partenaire' : 'Info'}</span>
                  <h3 className="font-bold text-text-primary text-base mt-1">{latestNews.title}</h3>
                  {latestNews.subtitle && (
                    <p className="text-xs text-text-secondary mt-0.5">{latestNews.subtitle}</p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-primary">
                    Lire la suite <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
