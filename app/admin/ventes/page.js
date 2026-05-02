'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Search, Loader2, ShoppingCart, ChevronDown, ChevronUp, Download } from 'lucide-react';

export default function AdminSalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/admin/sales')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSales(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatMoney(cents) {
    if (!cents && cents !== 0) return '—';
    return (Number(cents) / 100).toFixed(2) + ' CHF';
  }

  function isInPeriod(dateStr) {
    if (period === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (period === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (period === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    if (period === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return true;
  }

  const filtered = sales
    .filter(s => isInPeriod(s.created_at))
    .filter(s => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (s.client_name || '').toLowerCase().includes(q) ||
        (s.receipt || '').toLowerCase().includes(q)
      );
    });

  const totalRevenue = filtered.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  const todaySales = sales.filter(s => s.created_at && new Date(s.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  function exportCSV() {
    const rows = [
      ['Date', 'Client', 'Montant CHF', 'Articles'],
      ...filtered.map(s => [
        formatDate(s.created_at),
        s.client_name || 'Inconnu',
        (Number(s.price) / 100).toFixed(2),
        `"${(s.receipt || '').replace(/"/g, '""')}"`,
      ]),
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = period === 'today' ? 'aujourd_hui' : period === 'week' ? '7_jours' : period === 'month' ? 'ce_mois' : 'toutes';
    a.download = `ventes_${label}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
          <p className="text-2xl font-bold text-text-primary">{sales.length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Ventes</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-green-600">{formatMoney(totalRevenue)}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{period === 'all' ? 'Total' : 'Période'}</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-blue-600">{formatMoney(todayRevenue)}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Aujourd'hui</p>
        </div>
      </div>

      {/* Filtres + export */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Client, produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card-bg border border-border-light text-sm"
          />
        </div>
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
        <button
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-card-bg border border-border-light text-xs font-bold text-text-secondary active:scale-95 transition-all disabled:opacity-40"
          title="Exporter en CSV"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.map((sale, i) => (
          <div key={i} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <ShoppingCart size={14} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span
                  className="inline font-bold text-sm text-primary truncate underline decoration-primary/30 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (sale.user_id) router.push(`/admin/users?highlight=${sale.user_id}`);
                  }}
                >{sale.client_name || 'Client inconnu'}</span>
                <p className="text-[10px] text-text-muted">{formatDate(sale.created_at)}</p>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <p className="font-bold text-sm text-green-600">{formatMoney(sale.price)}</p>
                {expanded === i ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
              </div>
            </button>

            {expanded === i && sale.receipt && (
              <div className="px-4 pb-4 pt-0 border-t border-border-light">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider pt-3 mb-2">Articles</p>
                <ul className="space-y-1">
                  {sale.receipt.split(', ').map((item, j) => (
                    <li key={j} className="text-xs text-text-primary flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Receipt size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">Aucune vente trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
