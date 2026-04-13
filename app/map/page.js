'use client';

import { useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

const LAT = 46.4792;
const LON = 6.8417;

export default function MapPage() {
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | loading | error

  function openHereWeGo() {
    if (!navigator.geolocation) {
      // Pas de géoloc dispo → ouvrir sans position de départ
      window.open(`https://wego.here.com/directions/drive/mylocation/${LAT},${LON}`, '_blank', 'noreferrer');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoStatus('idle');
        const { latitude, longitude } = pos.coords;
        window.open(
          `https://wego.here.com/directions/drive/${latitude},${longitude}/${LAT},${LON}`,
          '_blank',
          'noreferrer'
        );
      },
      () => {
        // Permission refusée ou erreur → fallback sans position
        setGeoStatus('error');
        window.open(`https://wego.here.com/directions/drive/mylocation/${LAT},${LON}`, '_blank', 'noreferrer');
        setTimeout(() => setGeoStatus('idle'), 3000);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  return (
    <main className="relative max-w-md mx-auto w-full bg-app-bg shadow-2xl border-x border-border-light overflow-hidden h-full">
      <iframe
        className="w-full h-full border-none"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=6.832,46.472,6.852,46.486&layer=mapnik&marker=${LAT},${LON}`}
      />
      <div className="absolute bottom-10 left-4 right-4 bg-card-bg p-5 rounded-3xl shadow-2xl border border-border-light z-20">
        <div className="flex items-start gap-4">
          <div className="size-12 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg text-text-primary">Épicerie de Jongny</h3>
            <p className="text-sm text-text-muted italic">Rte de Châtel-St-Denis 38, 1805 Jongny</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="size-2 bg-green-500 rounded-full animate-pulse inline-block"></span>
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Ouvert 24h/24</span>
            </div>
          </div>
        </div>

        {/* Navigation HERE WeGo — départ depuis position GPS actuelle */}
        <button
          onClick={openHereWeGo}
          disabled={geoStatus === 'loading'}
          className="w-full mt-4 bg-primary text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-95 disabled:opacity-70"
        >
          {geoStatus === 'loading' ? (
            <><Loader2 size={16} className="animate-spin" /> Localisation…</>
          ) : (
            <><Navigation size={16} /> Y aller avec HERE WeGo</>
          )}
        </button>
        {geoStatus === 'error' && (
          <p className="text-[10px] text-text-muted text-center mt-1">Position non disponible — ouverture sans point de départ</p>
        )}

        {/* Fallback Google Maps */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${LAT},${LON}`}
          target="_blank"
          rel="noreferrer"
          className="w-full mt-2 bg-border-light text-text-muted py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all active:scale-95"
        >
          Ou via Google Maps
        </a>
      </div>
    </main>
  );
}
