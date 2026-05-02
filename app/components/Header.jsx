'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, LayoutDashboard, Sprout } from 'lucide-react';
import { Righteous } from 'next/font/google';
import { APP_LOGO, APP_NAME } from '../lib/config';

const righteous = Righteous({ subsets: ['latin'], weight: '400' });

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
  '/admin': { href: '/home' },
  '/recus': { href: '/profil' },
  '/listes': { href: '/profil' },
};

// Préfixes dynamiques : si le pathname commence par l'une de ces clés, on utilise le href correspondant
const BACK_PREFIXES = [
  { prefix: '/recus/', href: '/recus' },
  { prefix: '/admin/', href: '/admin' },
  { prefix: '/producteur', href: '/home' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProducer, setIsProducer] = useState(false);
  const [isVisitor, setIsVisitor] = useState(false);

  useEffect(() => {
    try { setIsVisitor(sessionStorage.getItem('app_mode') === 'visitor'); } catch {}

    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.role === 'admin') setIsAdmin(true);
        if (data?.user?.role === 'producer') setIsProducer(true);
      });
  }, []);

  if (pathname === '/') return null;

  const backRoute = BACK_ROUTES[pathname]
    ?? BACK_PREFIXES.find(p => pathname.startsWith(p.prefix));

  return (
    <header className="relative shrink-0 z-[100] w-full flex items-center justify-between px-4 pt-4 pb-2">
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

      {/* Centre : logo */}
      <div className='flex justify-center absolute left-1/2 -translate-x-1/2 items-center'>
        <img src={APP_LOGO} alt={APP_NAME} className="h-8 w-auto" />
      </div>

      {/* Droite : boutons de rôle */}
      <div className="flex items-center gap-1.5 justify-end">
        {isProducer && !isAdmin && !isVisitor && (
          <Link
            href="/producteur"
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-green-50 border border-green-200 active:scale-90 transition-all"
          >
            <Sprout size={15} className="text-green-600" />
            <span className="text-xs font-bold text-green-700">Producteur</span>
          </Link>
        )}
        {isAdmin && !isVisitor && (
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
