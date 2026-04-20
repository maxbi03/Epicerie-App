'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-8xl font-bold text-primary">404</p>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-800">Page introuvable</h1>
        <p className="text-gray-500 text-sm">Cette page n&apos;existe pas ou a été déplacée.</p>
      </div>
      <Link
        href="/home"
        className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow hover:opacity-90 transition"
      >
        <Home size={16} />
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
