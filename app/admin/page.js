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

  const cards = [
    { label: 'Produits total', value: stats.totalProducts, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { label: 'En rupture', value: stats.outOfStock, color: 'bg-red-50 text-red-500 border-red-100' },
    { label: 'Stock faible', value: stats.lowStock, color: 'bg-amber-50 text-amber-500 border-amber-100' },
    { label: 'En stock', value: stats.totalProducts - stats.outOfStock, color: 'bg-green-50 text-green-600 border-green-100' },
  ];

  return (
    <div className="px-5 py-4">
      <h2 className="text-xl font-bold text-text-primary mb-1">Tableau de bord</h2>
      <p className="text-sm text-text-secondary mb-6">Vue d'ensemble de l'épicerie</p>

      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <div key={card.label} className={`rounded-2xl p-4 border ${card.color}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{card.label}</p>
            <p className="text-3xl font-black mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
