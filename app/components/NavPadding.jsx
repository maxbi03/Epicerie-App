'use client';

import { usePathname } from 'next/navigation';

// Réserve l'espace sous le contenu pour que la bottom nav ne le cache pas
export default function NavPadding({ children }) {
  const pathname = usePathname();
  const hasNav = pathname !== '/' && !pathname.startsWith('/admin');

  return (
    <div className={`h-full ${hasNav ? 'pb-24' : ''}`}>
      {children}
    </div>
  );
}
