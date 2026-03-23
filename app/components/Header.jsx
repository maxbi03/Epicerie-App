'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { Home, Newspaper, Camera, ShoppingCart, Map, Package, User, LayoutDashboard, Tag, LogOut, Menu } from 'lucide-react';

const PAGE_TITLES = {
  '/home': 'Accueil',
  '/news': 'Le Fil Rouge',
  '/scanner': 'Scanner',
  '/panier': 'Mon Panier',
  '/map': 'Carte des épiceries',
  '/stock': 'État des stocks',
  '/profil': 'Mon Profil',
  '/admin': 'Administration',
  '/admin/produits': 'Gestion Produits',
};

const NAV_LINKS = [
  { href: '/home', label: 'Accueil', Icon: Home },
  { href: '/news', label: 'Le Fil Rouge', Icon: Newspaper },
  { href: '/scanner', label: 'Scanner un produit', Icon: Camera },
  { href: '/panier', label: 'Mon Panier', Icon: ShoppingCart },
];

const INFO_LINKS = [
  { href: '/map', label: 'Carte & Localisation', Icon: Map },
  { href: '/stock', label: 'État des stocks', Icon: Package },
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
    function updateCart() {
      const basket = JSON.parse(localStorage.getItem('user_basket') || '[]');
      setCartCount(basket.length);
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.email) return;
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
      setIsAdminUser(adminEmail && session.user.email.toLowerCase() === adminEmail.toLowerCase());
    });
  }, []);

  function toggleMenu() {
    setMenuOpen(o => !o);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  async function handleLogout() {
    try {
      sessionStorage.removeItem('app_mode');
      localStorage.removeItem('user_basket');
      // TODO : pb.authStore.clear() lors de la migration Pocketbase
      router.push('/');
    } catch (e) {
      router.push('/');
    }
  }

  if (pathname === '/' || pathname === '/inscription' || pathname === '/reset') {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-[100] max-w-md mx-auto flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMenu}
            className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-white/10 active:scale-90 transition-all"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight dark:text-white">{title}</h1>
            <p className="text-[10px] text-gray-500 font-medium italic uppercase tracking-tighter">Village Connecté</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/panier" className="relative size-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-white/10 flex items-center justify-center active:scale-90 transition-all">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 size-5 bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Link href="/profil" className="size-10 rounded-full bg-green-100 flex items-center justify-center border border-green-200">
            <User size={20} />
          </Link>
        </div>
      </header>

      {menuOpen && (
        <div
          onClick={closeMenu}
          className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      <nav className={`fixed top-0 left-0 bottom-0 w-[280px] bg-white dark:bg-green-950 z-[120] transition-transform duration-300 ease-out shadow-2xl flex flex-col ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-100 dark:border-white/5">
          <div className="text-green-600 font-black tracking-tighter text-xl mb-1">L'ÉPICERIE</div>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Menu de navigation</div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={closeMenu}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-gray-700 dark:text-gray-200
                ${pathname === link.href ? 'bg-green-50 dark:bg-green-900/30 text-green-700' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
              <link.Icon size={20} />
              <span className="font-bold text-sm">{link.label}</span>
            </Link>
          ))}

          <div className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Informations</div>

          {INFO_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={closeMenu}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-gray-700 dark:text-gray-200
                ${pathname === link.href ? 'bg-green-50 dark:bg-green-900/30 text-green-700' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
              <link.Icon size={20} />
              <span className="font-bold text-sm">{link.label}</span>
            </Link>
          ))}

          <div className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Compte</div>

          {ACCOUNT_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={closeMenu}
              className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-gray-700 dark:text-gray-200
                ${pathname === link.href ? 'bg-green-50 dark:bg-green-900/30 text-green-700' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
              <link.Icon size={20} />
              <span className="font-bold text-sm">{link.label}</span>
            </Link>
          ))}

          {isAdminUser && (
            <>
              <div className="py-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Administration</div>
              <Link href="/admin" onClick={closeMenu}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-gray-700 dark:text-gray-200
                  ${pathname === '/admin' ? 'bg-green-50 dark:bg-green-900/30 text-green-700' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                <LayoutDashboard size={20} />
                <span className="font-bold text-sm">Tableau de bord</span>
              </Link>
              <Link href="/admin/produits" onClick={closeMenu}
                className={`flex items-center gap-4 p-4 rounded-2xl transition-colors text-gray-700 dark:text-gray-200
                  ${pathname === '/admin/produits' ? 'bg-green-50 dark:bg-green-900/30 text-green-700' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                <Tag size={20} />
                <span className="font-bold text-sm">Gestion Produits</span>
              </Link>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20">
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