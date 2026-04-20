'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Home, Package, ScanLine, ShoppingCart, User, LayoutDashboard } from 'lucide-react';
import { getBasket } from '../lib/basket';

export default function BottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user?.role === 'admin') setIsAdmin(true); });
  }, []);

  const TABS = [
  { href: '/home',    label: 'Accueil',  Icon: Home },
  { href: '/stock',   label: 'Produits', Icon: Package },
  { href: '/scanner', label: 'Scanner',  Icon: ScanLine},
  { href: '/panier',  label: 'Panier',   Icon: ShoppingCart },
  { href: '/profil',  label: 'Profil',   Icon: User },
  ];

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
    <div
      className="fixed bottom-0 inset-x-0 z-50 flex justify-center pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <nav className="pointer-events-auto mb-3 flex items-end gap-0.5 backdrop-blur-2xl backdrop-saturate-150 rounded-[22px] px-3 py-3 border border-white/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),inset_0_-1px_0_0_rgba(255,255,255,0.2),inset_1px_0_0_0_rgba(255,255,255,0.3),inset_-1px_0_0_0_rgba(255,255,255,0.3),0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.08)]">
        {TABS.map(({ href, label, Icon, center }) => {
          const isActive = pathname === href || (href !== '/home' && pathname.startsWith(href + '/'));
          const isCart = href === '/panier';

          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-2 min-w-[58px] rounded-2xl transition-all duration-150 active:scale-90 ${
                isActive ? 'text-primary bg-primary-light' : 'text-gray-400'
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
    </div>
  );
}
