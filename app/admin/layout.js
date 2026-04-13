'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Tag, Newspaper, Users, Receipt, DoorOpen, Flag, ShoppingCart } from 'lucide-react';

const TABS = [
  { href: '/admin', label: 'Tableau de bord', Icon: LayoutDashboard },
  { href: '/admin/produits', label: 'Produits', Icon: Tag },
  { href: '/admin/news', label: 'News', Icon: Newspaper },
  { href: '/admin/users', label: 'Utilisateurs', Icon: Users },
  { href: '/admin/ventes', label: 'Ventes', Icon: Receipt },
  { href: '/admin/traffic', label: 'Traffic', Icon: DoorOpen },
  { href: '/admin/signalements', label: 'Signalements', Icon: Flag },
  { href: '/admin/commandes-groupees', label: 'Cmd. groupées', Icon: ShoppingCart },
];

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user?.role === 'admin') {
          setAuthorized(true);
        } else {
          router.push('/home');
        }
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <main className="flex h-full max-w-md mx-auto items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="relative flex h-full max-w-md mx-auto flex-col overflow-hidden">
      <div className="flex gap-1 px-4 pt-4 pb-2 overflow-x-auto shrink-0">
        {TABS.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all
              ${pathname === tab.href
                ? 'bg-primary text-white'
                : 'bg-card-bg text-text-secondary border border-border-light'
              }`}
          >
            <tab.Icon size={16} />
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </main>
  );
}
