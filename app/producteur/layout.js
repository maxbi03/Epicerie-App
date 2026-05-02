'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Truck, FileText, TrendingUp, Lightbulb } from 'lucide-react';
import { APP_LOGO, APP_NAME } from '../lib/config';

const TABS = [
  { href: '/producteur', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/producteur/ventes', label: 'Ventes', Icon: TrendingUp },
  { href: '/producteur/livraisons', label: 'Livraisons', Icon: Truck },
  { href: '/producteur/factures', label: 'Factures', Icon: FileText },
  { href: '/producteur/propositions', label: 'Propositions', Icon: Lightbulb },
];

export default function ProducerLayout({ children }) {
  const [producerName, setProducerName] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const role = data?.user?.role;
        if (role === 'producer' || role === 'admin') {
          setProducerName(data.user.name);
        } else {
          router.push('/home');
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/home');
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <main className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!producerName) return null;

  return (
    <main className="relative flex h-full flex-col overflow-hidden">
      {/* Header portail */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-4 pb-2 border-b border-border-light">
        <div className="flex items-center gap-2">
          <img src={APP_LOGO} alt={APP_NAME} className="h-7 w-auto" />
          <div>
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Portail producteur</p>
            <p className="text-sm font-bold text-text-primary leading-none">{producerName}</p>
          </div>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 px-4 py-2 overflow-x-auto shrink-0">
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
            <tab.Icon size={15} />
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
