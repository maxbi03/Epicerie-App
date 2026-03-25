'use client';

import { supabase } from '../lib/supabaseClient';
import { fetchUserProfile } from '../lib/userService';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, MapPin, Lock, Camera, Package, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const [isVisitor, setIsVisitor] = useState(false);
  const [greeting, setGreeting] = useState('…');
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [latestNews, setLatestNews] = useState(null);

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
    if (visitor) { setGreeting('Visiteur'); return; }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setGreeting('Visiteur'); return; }
      fetchUserProfile(session.user.id).then(profile => {
        if (profile?.name) setGreeting(profile.name.split(' ')[0]);
      });
    });

    fetch('/api/news')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setLatestNews(data[0]); })
      .catch(() => {});
  }, []);

  return (
    <>
      {emailUnverified && (
        <div className="max-w-md mx-auto w-full">
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">Email non confirmé</p>
              <p className="text-xs text-amber-600 mt-0.5">Vérifiez votre boîte mail et cliquez sur le lien de confirmation.</p>
            </div>
            <button className="text-xs font-black text-amber-600 whitespace-nowrap hover:text-amber-800 transition-colors shrink-0">
              Renvoyer
            </button>
          </div>
        </div>
      )}

      <main className="relative flex h-full max-w-md mx-auto flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-10">

          <div className="px-5 pt-6 pb-2">
            <h1 className="text-2xl font-bold text-text-primary">
              Bonjour, <span>{greeting}</span> !
            </h1>
            <p className="text-sm text-text-secondary">Bienvenue dans votre épicerie autonome.</p>
          </div>

          {/* CARD PORTE */}
          <div className="p-5">
            <div className="bg-card-bg rounded-3xl p-6 flex flex-col items-center text-center relative border border-border-light shadow-sm">
              <div className="mb-6">
                <div className="size-16 bg-app-bg rounded-full flex items-center justify-center border border-border">
                  <MapPin size={32} className="text-text-muted" />
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-text-primary text-xl font-bold mb-1">Aucun magasin détecté</h2>
                <p className="text-text-muted text-sm font-medium">Approchez-vous d'une borne Bluetooth</p>
              </div>

              <button disabled className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 opacity-60 bg-app-bg cursor-not-allowed">
                <Lock size={24} className="text-text-muted" />
                <span className="text-text-muted font-bold text-lg uppercase tracking-wider">
                  {isVisitor ? 'Compte requis' : 'Porte verrouillée'}
                </span>
              </button>

              {isVisitor && (
                <div className="w-full mt-4 bg-primary-light border border-border-light rounded-2xl p-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 size-10 rounded-xl bg-primary-light flex items-center justify-center">
                      <Lock size={20} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-text-primary">Déverrouillage désactivé</p>
                      <p className="text-xs text-text-secondary leading-relaxed mt-1">
                        Créez un compte et vérifiez-le pour utiliser cette fonctionnalité.
                      </p>
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <Link href="/" className="w-full py-3 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all">
                          Se connecter
                        </Link>
                        <Link href="/" className="w-full py-3 rounded-xl bg-primary-light text-forest-green font-black text-[10px] uppercase tracking-widest text-center active:scale-[0.98] transition-all">
                          Créer un compte
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RACCOURCIS */}
          <div className="px-5 mb-6">
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Raccourcis</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/scanner" className="flex items-center gap-3 bg-card-bg rounded-2xl p-4 border border-border-light shadow-sm active:scale-[0.98] transition-all">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Camera size={20} className="text-primary" />
                </div>
                <span className="font-bold text-sm text-text-primary">Scanner</span>
              </Link>
              <Link href="/stock" className="flex items-center gap-3 bg-card-bg rounded-2xl p-4 border border-border-light shadow-sm active:scale-[0.98] transition-all">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package size={20} className="text-primary" />
                </div>
                <span className="font-bold text-sm text-text-primary">Produits</span>
              </Link>
            </div>
          </div>

          {/* DERNIÈRE NEWS */}
          {latestNews && (
            <div className="px-5 mb-6">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest mb-3">Actualité</h3>
              <Link href="/news" className="block bg-card-bg rounded-2xl overflow-hidden shadow-sm border border-border-light active:scale-[0.98] transition-all">
                {latestNews.image1 && (
                  <img src={latestNews.image1} className="w-full h-36 object-cover" alt="" />
                )}
                <div className="p-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    latestNews.category === 'offres' ? 'text-green-600' :
                    latestNews.category === 'evenements' ? 'text-amber-500' :
                    latestNews.category === 'partenaires' ? 'text-green-600' :
                    'text-blue-500'
                  }`}>{latestNews.category === 'offres' ? 'Offre' : latestNews.category === 'evenements' ? 'Événement' : latestNews.category === 'partenaires' ? 'Partenaire' : 'Info'}</span>
                  <h3 className="font-bold text-text-primary text-base mt-1">{latestNews.title}</h3>
                  {latestNews.subtitle && (
                    <p className="text-xs text-text-secondary mt-0.5">{latestNews.subtitle}</p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-primary">
                    Lire la suite <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            </div>
          )}

        </div>
      </main>
    </>
  );
}