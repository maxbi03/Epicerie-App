'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProfilPage() {
  const [isVisitor, setIsVisitor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    firstName: 'Chargement...',
    lastName: '',
    phone: '',
    name: 'Chargement...',
    points: 0,
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
  }, []);

  function handleEditClick() {
    setEditForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone,
    });
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handleSave() {
    if (!editForm.firstName || !editForm.lastName) {
      alert('Le prénom et le nom sont obligatoires');
      return;
    }
    setProfile(p => ({
      ...p,
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: editForm.phone,
      name: `${editForm.firstName} ${editForm.lastName}`,
    }));
    setIsEditing(false);
    alert('Informations mises à jour !');
  }

  if (isVisitor) return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 min-h-screen">
      <div className="flex flex-col items-center mb-8">
        <div className="size-28 rounded-[2rem] bg-gray-100 dark:bg-white/5 flex items-center justify-center border-2 border-green-500 shadow-xl">
          <span className="text-5xl">👤</span>
        </div>
        <h2 className="text-2xl font-bold mt-5 text-green-900 dark:text-white">Visiteur</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Visiteur</p>
      </div>
      <div className="bg-white dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-sm p-6 text-center">
        <h3 className="text-lg font-black text-green-900 dark:text-white mb-2">Compte requis</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          Créez un compte pour accéder aux fonctionnalités de l'épicerie autonome.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/" className="w-full py-4 rounded-2xl bg-green-600 text-white font-black text-xs uppercase tracking-widest text-center active:scale-[0.98] transition-all">
            Se connecter
          </Link>
          <Link href="/" className="w-full py-4 rounded-2xl bg-green-100 text-green-700 font-black text-xs uppercase tracking-widest text-center active:scale-[0.98] transition-all">
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 min-h-screen">

      <div className="flex flex-col items-center mb-8">
        <div className="size-28 rounded-[2rem] bg-white dark:bg-white/5 flex items-center justify-center border-2 border-green-500 shadow-xl overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop"
            className="w-full h-full object-cover"
            alt="Avatar"
          />
        </div>
        <h2 className="text-2xl font-bold mt-5 text-green-900 dark:text-white">{profile.name}</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Membre</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-white dark:bg-white/5 p-5 rounded-3xl border shadow-sm text-center">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Points Fidélité</span>
          <span className="text-2xl font-black text-green-600 italic">{profile.points}</span>
        </div>
        <div className="bg-white dark:bg-white/5 p-5 rounded-3xl border shadow-sm text-center">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Économies</span>
          <span className="text-2xl font-black text-green-900 dark:text-white">0.00 <span className="text-xs">CHF</span></span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4 mb-3">Compte & Sécurité</h3>
          <div className="bg-white dark:bg-white/5 rounded-[2rem] border overflow-hidden shadow-sm p-4">

            {!isEditing ? (
              <div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prénom</p>
                  <p className="text-sm font-bold text-green-900 dark:text-gray-200">{profile.firstName}</p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nom</p>
                  <p className="text-sm font-bold text-green-900 dark:text-gray-200">{profile.lastName}</p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Téléphone</p>
                  <p className="text-sm font-bold text-green-900 dark:text-gray-200">{profile.phone || '—'}</p>
                </div>
                <button onClick={handleEditClick} className="w-full py-3 mt-2 rounded-2xl bg-green-600 text-white font-bold text-sm hover:brightness-105 transition-all">
                  Modifier mes informations
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={editForm.firstName}
                  onChange={e => setEditForm(f => ({...f, firstName: e.target.value}))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
                />
                <input
                  type="text"
                  placeholder="Nom"
                  value={editForm.lastName}
                  onChange={e => setEditForm(f => ({...f, lastName: e.target.value}))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
                />
                <input
                  type="tel"
                  placeholder="Téléphone"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({...f, phone: e.target.value}))}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm"
                />
                <div className="flex gap-3">
                  <button onClick={handleSave} className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-bold text-sm transition-all">
                    Sauvegarder
                  </button>
                  <button onClick={handleCancel} className="flex-1 py-3 rounded-2xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white font-bold text-sm transition-all">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button className="w-full py-4 rounded-3xl bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-gray-100 dark:border-white/10">
          🔒 Réinitialiser mon mot de passe
        </button>

        <button className="w-full py-4 rounded-3xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all">
          Se déconnecter de l'application
        </button>
      </div>

    </main>
  );
}