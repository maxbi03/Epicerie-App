'use client';

import { useEffect, useState } from 'react';
import { fetchAdminStats } from '../lib/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-5 py-10 text-center text-red-500 text-sm font-medium">{error}</div>
    );
  }

  return (
    <div className="px-5 py-4">
      <h2 className="text-xl font-bold text-text-primary mb-1">Tableau de bord</h2>
      <p className="text-sm text-text-secondary mb-6">Vue d'ensemble de l'épicerie</p>

      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">Ventes</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-2xl p-3 border bg-purple-50 text-purple-600 border-purple-100">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Aujourd'hui</p>
          <p className="text-2xl font-black mt-1">{stats.sales.revenueToday.toFixed(2)}</p>
          <p className="text-[10px] font-bold opacity-60">{stats.sales.today} vente{stats.sales.today > 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl p-3 border bg-purple-50 text-purple-600 border-purple-100">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ce mois</p>
          <p className="text-2xl font-black mt-1">{stats.sales.revenueMonth.toFixed(2)}</p>
          <p className="text-[10px] font-bold opacity-60">{stats.sales.month} vente{stats.sales.month > 1 ? 's' : ''}</p>
        </div>
        <div className="rounded-2xl p-3 border bg-purple-50 text-purple-600 border-purple-100">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total</p>
          <p className="text-2xl font-black mt-1">{stats.sales.totalRevenue.toFixed(2)}</p>
          <p className="text-[10px] font-bold opacity-60">{stats.sales.total} vente{stats.sales.total > 1 ? 's' : ''}</p>
        </div>
      </div>

      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">Produits</p>
      <div className="rounded-2xl p-4 border bg-blue-50 text-blue-600 border-blue-100 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Produits total</p>
          <div className="flex gap-3">
            <span className="text-[10px] font-bold text-green-600">{stats.activeProducts} actifs</span>
            <span className="text-[10px] font-bold text-orange-500">{stats.incomplete} incomplets</span>
          </div>
        </div>
        <p className="text-3xl font-black mt-1">{stats.totalProducts}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">Stock Rayon</p>
          <div className="space-y-2">
            <div className="rounded-2xl p-4 border bg-green-50 text-green-600 border-green-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">En stock</p>
              <p className="text-3xl font-black mt-1">{stats.shelf.ok}</p>
            </div>
            <div className="rounded-2xl p-4 border bg-amber-50 text-amber-500 border-amber-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Stock faible</p>
              <p className="text-3xl font-black mt-1">{stats.shelf.low}</p>
            </div>
            <div className="rounded-2xl p-4 border bg-red-50 text-red-500 border-red-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Rupture</p>
              <p className="text-3xl font-black mt-1">{stats.shelf.outOfStock}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">Stock Réserve</p>
          <div className="space-y-2">
            <div className="rounded-2xl p-4 border bg-green-50 text-green-600 border-green-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">En stock</p>
              <p className="text-3xl font-black mt-1">{stats.back.ok}</p>
            </div>
            <div className="rounded-2xl p-4 border bg-amber-50 text-amber-500 border-amber-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Stock faible</p>
              <p className="text-3xl font-black mt-1">{stats.back.low}</p>
            </div>
            <div className="rounded-2xl p-4 border bg-red-50 text-red-500 border-red-100">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Rupture</p>
              <p className="text-3xl font-black mt-1">{stats.back.outOfStock}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
