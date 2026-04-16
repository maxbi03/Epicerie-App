'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, LayoutDashboard } from 'lucide-react';

const PAGE_TITLES = {
  '/news':    'Le Fil Rouge',
  '/scanner': 'Scanner',
  '/panier':  'Mon Panier',
  '/map':     "L'Épicerie",
  '/stock':   'Produits',
  '/profil':  'Mon Profil',
  '/recus':   'Mes Reçus',
  '/listes':  'Mes Listes',
  '/home':  'Accueil',
  '/admin':  'Administration',
};

const BACK_ROUTES = {
  '/panier/confirmation': { href: '/panier' },
  '/admin/produits': { href: '/home' },
  '/admin': { href: '/home' },
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user?.role === 'admin') setIsAdmin(true); });
  }, []);

  if (pathname === '/') {
    return null;
  }

  const backRoute = BACK_ROUTES[pathname];
  const title = PAGE_TITLES[pathname] ?? 'EPICO';

  return (
    <header className="relative shrink-0 z-[100] max-w-md mx-auto w-full flex items-center justify-between px-4 pt-4 pb-2">
      {/* Gauche : retour ou espace */}
      <div className="w-10">
        {backRoute && (
          <button
            onClick={() => router.push(backRoute.href)}
            className="size-9 flex items-center justify-center rounded-xl bg-card-bg border border-border-light active:scale-90 transition-all shadow-sm"
          >
            <ChevronLeft size={20} className="text-text-primary" />
          </button>
        )}
      </div>

      {/* Centre : titre — toujours centré sur la page en absolu */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-black tracking-tight text-text-primary pointer-events-none">{title}</h1>

      {/* Droite : admin */}
      <div className="flex justify-end">
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-primary/10 border border-primary/20 active:scale-90 transition-all"
          >
            <LayoutDashboard size={15} className="text-primary" />
            <span className="text-xs font-bold text-primary">Admin</span>
          </Link>
        )}
      </div>
    </header>
  );
}
