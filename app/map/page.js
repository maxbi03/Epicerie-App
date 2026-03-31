import { MapPin } from 'lucide-react';

export default function MapPage() {
  return (
    <main className="relative max-w-md mx-auto w-full bg-white shadow-2xl border-x border-gray-200 overflow-hidden h-full">
      <iframe
        className="w-full h-full border-none"
        src="https://www.openstreetmap.org/export/embed.html?bbox=6.90,46.55,6.96,46.59&layer=mapnik&marker=46.57316,6.92736&zoom=15"
      />
      <div className="absolute bottom-10 left-4 right-4 bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-2xl border border-gray-100 dark:border-white/10 z-20">
        <div className="flex items-start gap-4">
          <div className="size-12 bg-green-600 rounded-2xl flex items-center justify-center text-white shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-white">Épicerie de Semsales</h3>
            <p className="text-sm text-gray-500 italic">Place de la Gare, 1623 Semsales</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="size-2 bg-green-500 rounded-full animate-pulse inline-block"></span>
              <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Ouvert 24h/24</span>
            </div>
          </div>
        </div>
        <a href="https://www.google.com/maps/dir/?api=1&destination=Semsales+Gare" target="_blank" rel="noreferrer" className="w-full mt-4 bg-gray-100 dark:bg-white/5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 hover:text-white transition-all active:scale-95">
          Y aller avec Google Maps
        </a>
      </div>
    </main>
  );
}
