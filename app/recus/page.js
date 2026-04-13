'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, ChevronRight, ShoppingBasket } from 'lucide-react';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('fr-CH', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}

export default function RecusPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/api/receipts')
      .then(r => r.ok ? r.json() : [])
      .then(setReceipts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-text-primary">Mes reçus</h1>
        <p className="text-xs text-text-muted mt-0.5">Conservés pendant 30 jours</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="size-16 rounded-2xl bg-primary-light flex items-center justify-center">
            <Receipt size={28} className="text-primary" />
          </div>
          <div>
            <p className="font-black text-text-primary">Aucun reçu disponible</p>
            <p className="text-sm text-text-muted mt-1 max-w-[220px] mx-auto leading-relaxed">
              Vos reçus apparaissent ici après chaque achat, pendant 30 jours.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map(r => {
            const total = (r.price / 100).toFixed(2);
            const itemCount = r.items_json
              ? r.items_json.reduce((s, i) => s + i.qty, 0)
              : '—';
            return (
              <button key={r.id} onClick={() => router.push(`/recus/${r.id}`)}
                className="w-full flex items-center gap-4 bg-card-bg rounded-2xl border border-border-light px-5 py-4 active:scale-[0.98] transition-all text-left">
                <div className="size-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                  <Receipt size={17} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-text-primary">{total} CHF</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatDate(r.created_at)} · {formatTime(r.created_at)}
                  </p>
                  {itemCount !== '—' && (
                    <p className="text-[10px] text-text-muted mt-0.5 flex items-center gap-1">
                      <ShoppingBasket size={10} /> {itemCount} article{itemCount > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-text-muted shrink-0" />
              </button>
            );
          })}
          <p className="text-center text-[10px] text-text-muted pt-3 pb-1">
            Les reçus sont supprimés automatiquement après 30 jours
          </p>
        </div>
      )}
    </main>
  );
}
