'use client';

import { useState, useEffect } from 'react';
import { Users, Phone, Mail, MapPin, CheckCircle2, XCircle, Search, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q) ||
      (u.city || '').toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'total_spent') return (b.total_spent || 0) - (a.total_spent || 0);
    if (sortBy === 'created_at' && a.created_at && b.created_at) return new Date(b.created_at) - new Date(a.created_at);
    return (a.name || '').localeCompare(b.name || '');
  });

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatMoney(cents) {
    if (!cents && cents !== 0) return '—';
    return (cents / 100).toFixed(2) + ' CHF';
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
          <p className="text-2xl font-bold text-text-primary">{users.length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-green-600">{users.filter(u => u.phone_verified).length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tél. OK</p>
        </div>
        <div className="bg-card-bg rounded-2xl p-3 border border-border-light text-center">
          <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.address_verified).length}</p>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Adr. OK</p>
        </div>
      </div>

      {/* Recherche + tri */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card-bg border border-border-light text-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-card-bg border border-border-light text-xs font-bold"
        >
          <option value="created_at">Inscription</option>
          <option value="name">Nom</option>
          <option value="total_spent">Dépenses</option>
        </select>
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {sorted.map((user, i) => (
          <div key={i} className="bg-card-bg rounded-2xl border border-border-light overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              {/* Avatar */}
              <div className="size-10 rounded-full bg-primary-light flex items-center justify-center shrink-0 overflow-hidden border border-border-light">
                {user.avatar_url ? (
                  <img src={user.avatar_url} className="size-full object-cover" alt="" />
                ) : (
                  <span className="text-primary font-bold text-sm">
                    {(user.name || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-sm text-text-primary truncate">{user.name || 'Sans nom'}</p>
                  {user.phone_verified ? (
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-red-400 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-bold text-text-primary">{formatMoney(user.total_spent)}</p>
                {user.created_at && <p className="text-[10px] text-text-muted">{formatDate(user.created_at)}</p>}
              </div>

              {expanded === i ? <ChevronUp size={16} className="text-text-muted shrink-0" /> : <ChevronDown size={16} className="text-text-muted shrink-0" />}
            </button>

            {expanded === i && (
              <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border-light">
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-text-muted shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">Téléphone</p>
                      <p className="text-xs text-text-primary">{user.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-text-muted shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">Email</p>
                      <p className="text-xs text-text-primary">{user.email_verified ? 'Vérifié' : 'Non vérifié'}</p>
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-text-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-text-muted uppercase">Adresse</p>
                    {user.street || user.city ? (
                      <p className="text-xs text-text-primary">
                        {[user.street, user.house_number].filter(Boolean).join(' ')}
                        {user.street && user.city ? ', ' : ''}
                        {[user.postal_code, user.city].filter(Boolean).join(' ')}
                        {user.country && user.country !== 'CH' ? ` (${user.country})` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">—</p>
                    )}
                    <p className="text-[10px] text-text-muted">
                      {user.address_verified ? 'Adresse vérifiée' : 'Non vérifiée'}
                      {user.address_label ? ` — ${user.address_label}` : ''}
                    </p>
                  </div>
                </div>

                {/* Vérifications */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${user.phone_verified ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                    Tél. {user.phone_verified ? 'vérifié' : 'non vérifié'}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${user.email_verified ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'}`}>
                    Email {user.email_verified ? 'vérifié' : 'non vérifié'}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${user.address_verified ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                    Adresse {user.address_verified ? 'vérifiée' : 'non vérifiée'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {sorted.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
