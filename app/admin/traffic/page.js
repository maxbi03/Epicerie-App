'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DoorOpen, Search, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function AdminTrafficPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all, success, failed
  const [period, setPeriod] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/traffic')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function isInPeriod(dateStr) {
    if (period === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (period === 'today') return date.toDateString() === now.toDateString();
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    if (period === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    return true;
  }

  const filtered = entries
    .filter(e => isInPeriod(e.created_at))
    .filter(e => {
      if (filter === 'success') return e.success;
      if (filter === 'failed') return !e.success;
      return true;
    })
    .filter(e => {
      if (!search) return true;
      return (e.user_name || '').toLowerCase().includes(search.toLowerCase());
    });

  const totalSuccess = entries.filter(e => e.success).length;
  const totalFailed = entries.filter(e => !e.success).length;
  const todayEntries = entries.filter(e => e.created_at && new Date(e.created_at).toDateString() === new Date().toDateString());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-text-primary">{todayEntries.length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Aujourd'hui</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-green-600">{totalSuccess}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Ouvertures</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-red-500">{totalFailed}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Refus</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Rechercher un nom..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card-bg border border-border-light text-sm"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-card-bg border border-border-light text-xs font-bold"
        >
          <option value="all">Tous</option>
          <option value="success">Ouvertures</option>
          <option value="failed">Refus</option>
        </select>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-card-bg border border-border-light text-xs font-bold"
        >
          <option value="all">Tout</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">7 jours</option>
          <option value="month">Ce mois</option>
        </select>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.map((entry, i) => (
          <div key={i} className="bg-card-bg rounded-2xl border border-border-light p-4 flex items-center gap-3">
            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${entry.success ? 'bg-green-100' : 'bg-red-50'}`}>
              {entry.success
                ? <CheckCircle2 size={16} className="text-green-600" />
                : <XCircle size={16} className="text-red-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <span
                className="inline font-bold text-sm text-primary truncate underline decoration-primary/30 cursor-pointer"
                onClick={() => {
                  if (entry.user_id) router.push(`/admin/users?highlight=${entry.user_id}`);
                }}
              >{entry.user_name || 'Inconnu'}</span>
              <p className="text-[10px] text-text-muted">{formatDate(entry.created_at)}</p>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 ${entry.success ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
              {entry.success ? 'Ouvert' : 'Refusé'}
            </span>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <DoorOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">Aucun passage enregistré</p>
          </div>
        )}
      </div>
    </div>
  );
}
