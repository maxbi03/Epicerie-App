import { MapPin } from 'lucide-react';

export default function MapPage() {
  return (
    <main className="relative max-w-md mx-auto w-full bg-app-bg shadow-2xl border-x border-border-light overflow-hidden h-full">
      <iframe
        className="w-full h-full border-none"
        src="https://www.openstreetmap.org/export/embed.html?bbox=6.841,46.470,6.861,46.484&layer=mapnik&marker=46.477,6.851"
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
        <a
          href="https://www.google.com/maps/dir/?api=1&destination=Route+de+Ch%C3%A2tel-St-Denis+38+1805+Jongny"
          target="_blank"
          rel="noreferrer"
          className="w-full mt-4 bg-border-light text-text-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all active:scale-95"
        >
          Y aller avec Google Maps
        </a>
      </div>
    </main>
  );
}
