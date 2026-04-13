'use client';

import { useEffect, useState } from 'react';
import { Flag, ShoppingBasket, Trash2, Wind, HelpCircle, Wrench, Check, X, Loader2, Clock, AlertTriangle } from 'lucide-react';

const TYPE_META = {
  product_missing: { label: 'Produit manquant', Icon: ShoppingBasket, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  product_damaged: { label: 'Produit abîmé / échu', Icon: Trash2, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', pill: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' },
  store_dirty:     { label: 'Magasin sale', Icon: Wind, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-900/20', pill: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  technical:       { label: 'Problème technique', Icon: Wrench, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20', pill: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  other:           { label: 'Autre problème', Icon: HelpCircle, color: 'text-text-muted', bg: 'bg-app-bg', pill: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
};

function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
  return d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSignalements() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(null);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter === 'all' ? '' : filter}`);
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReports(); }, [filter]);

  async function handleResolve(id) {
    setUpdating(id);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'resolved' }),
      });
      if (!res.ok) throw new Error();
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r));
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setUpdating(null);
    }
  }

  async function handleReopen(id) {
    setUpdating(id);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'pending' }),
      });
      if (!res.ok) throw new Error();
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'pending' } : r));
    } catch {
      setError('Erreur lors de la mise à jour');
    } finally {
      setUpdating(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce signalement ?')) return;
    setUpdating(id);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setReports(prev => prev.filter(r => r.id !== id));
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setUpdating(null);
    }
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="flex flex-col h-full overflow-x-hidden">
      <div className="px-5 pt-4 shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              Signalements
              {filter !== 'resolved' && pendingCount > 0 && (
                <span className="text-xs font-black bg-red-500 text-white rounded-full px-2 py-0.5">{pendingCount}</span>
              )}
            </h2>
            <p className="text-sm text-text-secondary">{reports.length} signalement{reports.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
            <button onClick={() => setError('')}><X size={14} className="text-red-400" /></button>
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-2 pb-3 overflow-x-auto">
          {[
            { key: 'pending',  label: 'En attente' },
            { key: 'resolved', label: 'Résolus' },
            { key: 'all',      label: 'Tous' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`shrink-0 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                filter === f.key ? 'bg-primary text-white' : 'bg-card-bg text-text-secondary border border-border-light'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="size-7 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
            <div className="size-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
              <Check size={24} className="text-green-500" />
            </div>
            <p className="text-sm font-bold">Aucun signalement en attente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map(report => {
              const meta = TYPE_META[report.type] || TYPE_META.other;
              const Icon = meta.Icon;
              const isUpdating = updating === report.id;
              const isPending = report.status === 'pending';

              return (
                <div key={report.id} className={`rounded-2xl border p-4 transition-all ${isPending ? 'bg-card-bg border-border-light' : 'bg-app-bg border-border-light opacity-70'}`}>
                  <div className="flex items-start gap-3">
                    {/* Icône type */}
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <Icon size={18} className={meta.color} />
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.pill}`}>
                          {meta.label}
                        </span>
                        {!isPending && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Résolu
                          </span>
                        )}
                      </div>

                      {report.description && (
                        <p className="text-sm text-text-primary leading-relaxed mb-1.5">
                          &ldquo;{report.description}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        <Clock size={10} />
                        <span>{shortDate(report.created_at)}</span>
                        {report.users?.name && (
                          <>
                            <span>·</span>
                            <span>{report.users.name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      {isUpdating ? (
                        <div className="size-9 flex items-center justify-center">
                          <Loader2 size={16} className="text-text-muted animate-spin" />
                        </div>
                      ) : isPending ? (
                        <button
                          onClick={() => handleResolve(report.id)}
                          className="size-9 flex items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 active:scale-90 transition-all"
                          title="Marquer comme résolu"
                        >
                          <Check size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReopen(report.id)}
                          className="size-9 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 active:scale-90 transition-all"
                          title="Rouvrir"
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="size-9 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 active:scale-90 transition-all"
                        title="Supprimer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
