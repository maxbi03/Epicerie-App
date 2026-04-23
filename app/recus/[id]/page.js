'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, ChevronLeft, Printer } from 'lucide-react';
import { APP_NAME, APP_DESCRIPTION } from '../../lib/config';

function pad(n) { return String(n).padStart(2, '0'); }

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function receiptId(id) {
  return id ? String(id).slice(0, 8).toUpperCase() : '--------';
}

export default function ReceiptPage() {
  const { id } = useParams();
  const router  = useRouter();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`/api/receipts/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setReceipt)
      .catch(() => setError('Reçu introuvable ou expiré.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handlePrint() { window.print(); }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <main className="px-5 pt-6 pb-4 h-full overflow-y-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-text-muted mb-6">
        <ChevronLeft size={16} /> Retour
      </button>
      <p className="text-center text-text-muted py-16">{error}</p>
    </main>
  );

  const total    = receipt.price / 100;
  const items    = receipt.items_json || [];
  // fallback: parse text receipt if no items_json
  const hasItems = items.length > 0;

  return (
    <>
      {/* ── Barre navigation (cachée à l'impression) ── */}
      <div className="no-print max-w-md mx-auto px-5 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-text-muted active:scale-95 transition-all">
          <ChevronLeft size={16} /> Mes reçus
        </button>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black active:scale-95 transition-all shadow-md shadow-primary/20">
          <Printer size={13} /> Enregistrer en PDF
        </button>
      </div>

      {/* ── Ticket de caisse ── */}
      <div className="receipt-wrapper max-w-md mx-auto px-5 pb-24">
        <div className="receipt-paper bg-white dark:bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mx-auto" style={{ maxWidth: '340px' }}>

          {/* Perforation haut */}
          <div className="no-print flex justify-center pt-3 pb-0">
            <div className="flex gap-1.5">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="size-1.5 rounded-full bg-gray-200" />
              ))}
            </div>
          </div>

          <div className="px-7 py-5 font-mono text-gray-900" style={{fontFamily: "'Courier New', Courier, monospace"}}>

            {/* En-tête magasin */}
            <div className="text-center mb-4">
              <p className="text-lg font-black tracking-widest uppercase">{APP_NAME}</p>
              <p className="text-xs text-gray-500 mt-0.5">{APP_DESCRIPTION}</p>
              <p className="text-xs text-gray-500">Jongny, Suisse</p>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* Info reçu */}
            <div className="text-xs space-y-0.5 mb-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span>{formatDateTime(receipt.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reçu n°</span>
                <span>{receiptId(receipt.id)}</span>
              </div>
              {receipt.client_name && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Client</span>
                  <span className="truncate max-w-[160px] text-right">{receipt.client_name}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* Articles */}
            {hasItems ? (
              <div className="space-y-1.5 mb-3">
                {items.map((item, i) => {
                  const lineTotal = (item.price * item.qty).toFixed(2);
                  return (
                    <div key={i}>
                      <p className="text-xs font-bold truncate">{item.name}</p>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{item.qty} × {Number(item.price).toFixed(2)} CHF</span>
                        <span>{lineTotal} CHF</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : receipt.receipt ? (
              <div className="text-xs mb-3 space-y-1">
                {receipt.receipt.split(',').map((line, i) => (
                  <p key={i} className="text-gray-700">{line.trim()}</p>
                ))}
              </div>
            ) : null}

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* Total */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Sous-total</span>
                <span>{total.toFixed(2)} CHF</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>TVA incluse</span>
                <span>—</span>
              </div>
              <div className="border-t border-gray-300 my-1" />
              <div className="flex justify-between text-base font-black">
                <span>TOTAL</span>
                <span>{total.toFixed(2)} CHF</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* Pied de ticket */}
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p>Merci pour votre achat !</p>
              <p className="text-[10px]">Reçu valable 30 jours</p>
            </div>

          </div>

          {/* Perforation bas */}
          <div className="no-print flex justify-center pb-3 pt-0">
            <div className="flex gap-1.5">
              {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="size-1.5 rounded-full bg-gray-200" />
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
