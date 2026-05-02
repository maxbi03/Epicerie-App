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

  if (pathname === '/' || pathname.startsWith('/admin') || pathname.startsWith('/producteur')) return null;

  return (
    <footer
      className="shrink-0 bg-primary-light dark:bg-gray-900 border-t border-primary/10 dark:border-white/10"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="flex items-end justify-around px-2 py-2">
        {TABS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || (href !== '/home' && pathname.startsWith(href + '/'));
          const isCart = href === '/panier';

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-2 min-w-[58px] rounded-2xl transition-all duration-150 active:scale-90 ${
                isActive ? 'text-primary bg-white/60 dark:bg-primary-light' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                {isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-green-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              {label && (
                <span className={`pt-1 text-[10px] font-bold leading-none ${isActive ? 'opacity-100' : 'opacity-50'}`}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
