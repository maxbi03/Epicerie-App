'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, Package, ScanLine, ShoppingCart, User } from 'lucide-react';
import { getBasket } from '../lib/basket';

const TABS = [
  { href: '/home',    label: 'Accueil',  Icon: Home },
  { href: '/stock',   label: 'Produits', Icon: Package },
  { href: '/scanner', label: 'Scanner',  Icon: ScanLine },
  { href: '/panier',  label: 'Panier',   Icon: ShoppingCart },
  { href: '/profil',  label: 'Profil',   Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const update = () => setCartCount(getBasket().length);
    update();
    window.addEventListener('storage', update);
    window.addEventListener('cart-updated', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('cart-updated', update);
    };
  }, []);

  if (pathname === '/' || pathname.startsWith('/admin')) return null;

  return (
    <footer
      className="shrink-0 bg-card-bg border-t border-border-light no-print"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="flex items-stretch">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/home' && pathname.startsWith(href + '/'));
          const isCart = href === '/panier';

          return (
            <Link
              key={href}
              href={href}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors active:bg-border-light"
            >
              {/* Indicateur actif en haut */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full transition-all duration-200 ${
                  isActive ? 'bg-primary' : 'bg-transparent'
                }`}
              />

              {/* Icône */}
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  className={isActive ? 'text-primary' : 'text-text-muted'}
                />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] font-bold leading-none transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted'
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
