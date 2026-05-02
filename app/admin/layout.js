'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      <main className="flex h-full items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="relative flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </main>
  );
}
