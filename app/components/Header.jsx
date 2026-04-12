'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Newspaper, Camera, ShoppingCart, Package, User, LayoutDashboard, LogOut, Menu } from 'lucide-react';
import { getBasket, clearBasket } from '../lib/basket';

const PAGE_TITLES = {
  '/home': 'Accueil',
  '/news': 'Le Fil Rouge',
  '/scanner': 'Scanner',
  '/panier': 'Mon Panier',
  '/map': 'Carte des épiceries',
  '/stock': 'Liste des produits',
  '/profil': 'Mon Profil',
  '/admin': 'Administration',
  '/admin/produits': 'Gestion Produits',
  '/admin/news': 'Gestion News',
  '/admin/users': 'Utilisateurs',
  '/admin/ventes': 'Ventes',
};

const NAV_LINKS = [
  { href: '/home', label: 'Accueil', Icon: Home },
  { href: '/news', label: 'Le Fil Rouge', Icon: Newspaper },
  { href: '/scanner', label: 'Scanner un produit', Icon: Camera },
  { href: '/panier', label: 'Mon Panier', Icon: ShoppingCart },
  { href: '/stock', label: 'Liste des produits', Icon: Package },
];

const ACCOUNT_LINKS = [
  { href: '/profil', label: 'Mon Profil', Icon: User },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const title = PAGE_TITLES[pathname] || "L'Épicerie";

  useEffect(() => {
    setMenuOpen(false);
    function updateCart() {
      setCartCount(getBasket().length);
    }
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('cart-updated', updateCart);
    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('cart-updated', updateCart);
    };
  }, [pathname]);

  useEffect(() => {
    setIsAdminUser(false);
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.role === 'admin') setIsAdminUser(true);
      });
  }, [pathname]);

  function toggleMenu() {
    setMenuOpen(o => !o);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('app_mode');
    clearBasket();
    router.push('/');
  }

  if (pathname === '/' || pathname === '/inscription' || pathname === '/reset') {
    return null;
  }

  return (
    <>
      <header className="shrink-0 z-[100] max-w-md mx-auto w-full flex items-center justify-between px-4 py-4 bg-header-bg border-b border-border-light">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMenu}
            className="size-10 flex items-center justify-center rounded-xl bg-card-bg shadow-sm border border-border-light active:scale-90 transition-all"
          >
            <Menu size={20} className="text-text-primary" />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight text-text-primary">{title}</h1>
            <p className="text-[10px] text-text-muted font-medium italic uppercase tracking-tighter">Village Connecté</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/panier" className="relative size-10 rounded-xl bg-card-bg shadow-sm border border-border-light flex items-center justify-center active:scale-90 transition-all">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-5 bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/profil" className="size-10 rounded-full bg-primary-light flex items-center justify-center border border-border-light">
            <User size={20} className="text-primary" />
          </Link>
        </div>
      </header>

      {menuOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      <nav className={`fixed top-0 left-0 bottom-0 w-[280px] bg-menu-bg z-[120] transition-transform duration-300 ease-out shadow-2xl flex flex-col ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border-light">
          <div className="text-primary font-black tracking-tighter text-xl mb-1">L'ÉPICERIE</div>
          <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Menu de navigation</div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={closeMenu}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-text-primary
                ${pathname === link.href ? 'bg-primary-light text-primary' : 'hover:bg-border-light'}`}>
              <link.Icon size={20} />
              <span className="font-bold text-sm">{link.label}</span>
            </Link>
          ))}

          <div className="py-4 px-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Compte</div>

          {ACCOUNT_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={closeMenu}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-text-primary
                ${pathname === link.href ? 'bg-primary-light text-primary' : 'hover:bg-border-light'}`}>
              <link.Icon size={20} />
              <span className="font-bold text-sm">{link.label}</span>
            </Link>
          ))}

          {isAdminUser && (
            <>
              <div className="py-4 px-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Administration</div>
              <Link href="/admin" onClick={closeMenu}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-text-primary
                  ${pathname.startsWith('/admin') ? 'bg-primary-light text-primary' : 'hover:bg-border-light'}`}>
                <LayoutDashboard size={20} />
                <span className="font-bold text-sm">Administration</span>
              </Link>
            </>
          )}
        </div>

        <div className="p-6 border-t border-border-light bg-app-bg">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-red-50 text-red-600 font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </nav>
    </>
  );
}