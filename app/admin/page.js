'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tag, Newspaper, Users, Receipt, DoorOpen, Flag, ShoppingCart, Truck, Sprout, AlertTriangle } from 'lucide-react';
import { fetchAdminStats } from '../lib/adminService';

const NAV_TILES = [
  { href: '/admin/produits',           label: 'Produits',        Icon: Tag,          color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { href: '/admin/ventes',             label: 'Ventes',          Icon: Receipt,      color: 'bg-purple-50 text-purple-600 border-purple-100' },
  { href: '/admin/users',              label: 'Utilisateurs',    Icon: Users,        color: 'bg-sky-50 text-sky-600 border-sky-100' },
  { href: '/admin/news',               label: 'News',            Icon: Newspaper,    color: 'bg-orange-50 text-orange-500 border-orange-100' },
  { href: '/admin/traffic',            label: 'Traffic',         Icon: DoorOpen,     color: 'bg-teal-50 text-teal-600 border-teal-100' },
  { href: '/admin/signalements',       label: 'Signalements',    Icon: Flag,         color: 'bg-red-50 text-red-500 border-red-100', badge: true },
  { href: '/admin/livraisons',         label: 'Livraisons',      Icon: Truck,        color: 'bg-amber-50 text-amber-500 border-amber-100' },
  { href: '/admin/commandes-groupees', label: 'Cmd. groupées',   Icon: ShoppingCart, color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
  { href: '/admin/producteurs',        label: 'Producteurs',     Icon: Sprout,       color: 'bg-green-50 text-green-600 border-green-100' },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    fetch('/api/admin/reports?status=pending')
      .then(r => r.ok ? r.json() : [])
      .then(data => setPendingReports(Array.isArray(data) ? data.length : 0))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="px-5 py-10 text-center text-red-500 text-sm font-medium">{error}</div>;
  }

  const { sales, belowThreshold } = stats;

  return (
    <div className="px-5 py-4 space-y-6">

      {/* ── Ventes ── */}
      <div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">Ventes</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl p-3 border bg-purple-50 text-purple-600 border-purple-100">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Aujourd'hui</p>
            <p className="text-xl font-black mt-1">{sales.revenueToday.toFixed(2)}</p>
            <p className="text-[10px] font-bold opacity-60">{sales.today} vente{sales.today !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-2xl p-3 border bg-purple-50 text-purple-600 border-purple-100">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ce mois</p>
            <p className="text-xl font-black mt-1">{sales.revenueMonth.toFixed(2)}</p>
            <p className="text-[10px] font-bold opacity-60">{sales.month} vente{sales.month !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-2xl p-3 border bg-purple-50 text-purple-600 border-purple-100">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Cette année</p>
            <p className="text-xl font-black mt-1">{sales.revenueYear.toFixed(2)}</p>
            <p className="text-[10px] font-bold opacity-60">{sales.year} vente{sales.year !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Alerte stock ── */}
      {belowThreshold.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">
            À réapprovisionner
          </p>
          <div className="rounded-2xl border bg-amber-50 border-amber-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <p className="text-xs font-black text-amber-700">
                {belowThreshold.length} produit{belowThreshold.length !== 1 ? 's' : ''} sous le seuil de stock rayon
              </p>
            </div>
            <div className="divide-y divide-amber-100">
              {belowThreshold.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-amber-900 font-medium truncate flex-1 mr-3">{p.name}</span>
                  <span className={`text-xs font-black shrink-0 ${p.stock_shelf === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.stock_shelf === 0 ? 'Rupture' : `${p.stock_shelf} restant${p.stock_shelf !== 1 ? 's' : ''}`}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/admin/produits" className="flex justify-center py-2.5 text-xs font-black text-amber-600 border-t border-amber-200 active:bg-amber-100 transition-colors">
              Gérer les produits →
            </Link>
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 px-1">Navigation</p>
        <div className="grid grid-cols-3 gap-2">
          {NAV_TILES.map(({ href, label, Icon, color, badge }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl border font-bold text-sm active:scale-95 transition-all shadow-sm ${color}`}
            >
              <Icon size={22} />
              <span className="text-xs font-black">{label}</span>
              {badge && pendingReports > 0 && (
                <span className="absolute top-2.5 right-2.5 min-w-[20px] h-5 flex items-center justify-center text-[10px] font-black bg-red-500 text-white rounded-full px-1.5">
                  {pendingReports > 9 ? '9+' : pendingReports}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
