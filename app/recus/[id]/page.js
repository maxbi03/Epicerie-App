'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Printer } from 'lucide-react';
import { APP_NAME, APP_DESCRIPTION, APP_ADDRESS, APP_IDE, APP_TVA_RATE, APP_TVA_LABEL } from '../../lib/config';

function pad(n) { return String(n).padStart(2, '0'); }

function formatDateTime(iso) {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function receiptId(id) {
  return id ? String(id).slice(0, 8).toUpperCase() : '--------';
}

function DashedLine() {
  return <div className="border-t border-dashed border-gray-300 my-3" />;
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between text-xs ${bold ? 'font-black text-gray-900' : 'text-gray-600'}`}>
      <span className={bold ? '' : 'text-gray-500'}>{label}</span>
      <span className="text-right max-w-[55%]">{value}</span>
    </div>
  );
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

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <main className="h-full overflow-y-auto px-5 pt-6 pb-4">
      <p className="text-center text-text-muted py-16">{error}</p>
    </main>
  );

  const total    = receipt.price / 100;
  const items    = receipt.items_json || [];
  const hasItems = items.length > 0;

  const tvaAmount = total / (1 + APP_TVA_RATE) * APP_TVA_RATE;
  const htAmount  = total - tvaAmount;
  const itemCount = hasItems ? items.reduce((s, i) => s + i.qty, 0) : null;

  return (
    <main className="h-full overflow-y-auto">

      {/* ── Bouton impression (caché à l'impression) ── */}
      <div className="no-print max-w-md mx-auto px-5 pt-3 pb-2 flex justify-end">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black active:scale-95 transition-all shadow-md shadow-primary/20">
          <Printer size={13} /> Enregistrer en PDF
        </button>
      </div>

      {/* ── Ticket de caisse ── */}
      <div className="max-w-md mx-auto px-5 pb-8">
        <div className="bg-white dark:bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm mx-auto" style={{ maxWidth: '340px' }}>

          {/* Perforation haut */}
          <div className="no-print flex justify-center pt-3">
            <div className="flex gap-1.5">
              {Array.from({length: 20}).map((_, i) => <div key={i} className="size-1.5 rounded-full bg-gray-200" />)}
            </div>
          </div>

          <div className="px-7 py-5 text-gray-900" style={{fontFamily: "'Courier New', Courier, monospace"}}>

            {/* ── En-tête commerçant ── */}
            <div className="text-center mb-4">
              <p className="text-lg font-black tracking-widest uppercase">{APP_NAME}</p>
              <p className="text-xs text-gray-500 mt-0.5">{APP_DESCRIPTION}</p>
              <p className="text-xs text-gray-500">{APP_ADDRESS}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{APP_IDE}</p>
            </div>

            <DashedLine />

            {/* ── Info transaction ── */}
            <div className="space-y-0.5 mb-3">
              <Row label="Date" value={formatDateTime(receipt.created_at)} />
              <Row label="Reçu n°" value={receiptId(receipt.id)} />
              {receipt.client_name && <Row label="Client" value={receipt.client_name} />}
              {itemCount !== null && <Row label="Articles" value={`${itemCount} article${itemCount > 1 ? 's' : ''}`} />}
            </div>

            <DashedLine />

            {/* ── Détail des articles ── */}
            {hasItems ? (
              <div className="space-y-2.5 mb-3">
                {items.map((item, i) => {
                  const unitPrice = Number(item.price).toFixed(2);
                  const lineTotal = (item.price * item.qty).toFixed(2);
                  return (
                    <div key={i}>
                      {/* Nom du produit + prix unitaire */}
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs font-bold truncate flex-1 mr-2">{item.name}</p>
                        <span className="text-xs text-gray-500 shrink-0">{unitPrice} CHF</span>
                      </div>
                      {/* Quantité + total de ligne */}
                      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                        <span>× {item.qty}</span>
                        <span className="font-bold text-gray-700">{lineTotal} CHF</span>
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

            <DashedLine />

            {/* ── Totaux & TVA ── */}
            <div className="space-y-0.5 mb-3">
              <Row label="Sous-total HT" value={`${htAmount.toFixed(2)} CHF`} />
              <Row label={`TVA ${APP_TVA_LABEL} (incluse)`} value={`${tvaAmount.toFixed(2)} CHF`} />
              <div className="border-t border-gray-400 my-1.5" />
              <div className="flex justify-between text-sm font-black text-gray-900">
                <span>TOTAL TTC</span>
                <span>{total.toFixed(2)} CHF</span>
              </div>
            </div>

            <DashedLine />

            {/* ── Moyen de paiement ── */}
            <div className="space-y-0.5 mb-3">
              <Row label="Paiement" value="Mobile / Carte bancaire" />
              <Row label="Statut" value="Payé" bold />
            </div>

            <DashedLine />

            {/* ── Pied de ticket ── */}
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p className="font-bold text-gray-600">Merci pour votre achat !</p>
              <p className="text-[10px] leading-relaxed">
                Pas de remboursement sur produits alimentaires entamés.<br />
                Échanges sur présentation du reçu dans les 7 jours.
              </p>
              <p className="text-[10px] mt-2 text-gray-300">
                Reçu valable 30 jours · {APP_NAME} ©{new Date().getFullYear()}
              </p>
            </div>

          </div>

          {/* Perforation bas */}
          <div className="no-print flex justify-center pb-3">
            <div className="flex gap-1.5">
              {Array.from({length: 20}).map((_, i) => <div key={i} className="size-1.5 rounded-full bg-gray-200" />)}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
