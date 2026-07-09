'use client';

import { useEffect, useState } from 'react';

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .then(data => {
        if (!active) return;
        if (data?.user?.role === 'admin') {
          setAuthorized(true);
        } else {
          // Redirection dure : garantit la navigation même si le routeur
          // client est dans un état intermédiaire.
          window.location.replace('/home');
        }
      });
    return () => { active = false; };
  }, []);

  // Tant que non autorisé : spinner (jamais de page blanche), le temps de la
  // vérification ou de la redirection.
  if (!authorized) {
    return (
      <main className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="relative flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </main>
  );
}
