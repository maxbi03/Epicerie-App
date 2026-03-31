'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { fetchUserProfile, updateUserProfile } from '../lib/userService';
import { User, Lock } from 'lucide-react';

export default function ProfilPage() {
  const router = useRouter();
  const [isVisitor, setIsVisitor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '' });

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
    if (!visitor) loadProfile();
    else setLoading(false);
  }, []);

  async function loadProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      const data = await fetchUserProfile(session.user.id);
      if (data) {
        const [firstName, ...rest] = (data.name || '').split(' ');
        setProfile({ ...data, firstName, lastName: rest.join(' ') });
      }
    } catch (err) {
      console.error('Erreur profil:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick() {
    setEditForm({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phone: profile?.phone || '',
    });
    setIsEditing(true);
  }

  async function handleSave() {
    if (!editForm.firstName || !editForm.lastName) {
      alert('Prénom et nom obligatoires.');
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const updated = await updateUserProfile(session.user.id, {
        name: `${editForm.firstName} ${editForm.lastName}`.trim(),
        phone: editForm.phone,
      });
      const [firstName, ...rest] = (updated.name || '').split(' ');
      setProfile({ ...updated, firstName, lastName: rest.join(' ') });
      setIsEditing(false);
      alert('Informations mises à jour !');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.removeItem('app_mode');
    router.push('/');
  }

  async function handleResetPassword() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) throw new Error('Email introuvable.');
      await supabase.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: window.location.origin + '/reset',
      });
      alert('Email de réinitialisation envoyé !');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isVisitor) return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 h-full overflow-y-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="size-28 rounded-[2rem] bg-app-bg flex items-center justify-center border-2 border-primary shadow-xl"><User size={48} className="text-text-muted" /></div>
        <h2 className="text-2xl font-bold mt-5 text-text-primary">Visiteur</h2>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Visiteur</p>
      </div>
      <div className="bg-card-bg rounded-[2rem] border border-border-light shadow-sm p-6 text-center">
        <h3 className="text-lg font-black text-text-primary mb-2">Compte requis</h3>
        <p className="text-sm text-text-secondary leading-relaxed">
          Créez un compte pour accéder aux fonctionnalités de l'épicerie autonome.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/" className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest text-center">
            Se connecter
          </Link>
          <Link href="/" className="w-full py-4 rounded-2xl bg-primary-light text-forest-green font-black text-xs uppercase tracking-widest text-center">
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 h-full overflow-y-auto">

      <div className="flex flex-col items-center mb-8">
        <div className="size-28 rounded-[2rem] bg-card-bg flex items-center justify-center border-2 border-primary shadow-xl overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200&auto=format&fit=crop"
            className="w-full h-full object-cover"
            alt="Avatar"
          />
        </div>
        <h2 className="text-2xl font-bold mt-5 text-text-primary">{profile?.name || 'Utilisateur'}</h2>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Membre</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-card-bg p-5 rounded-3xl border border-border-light shadow-sm text-center">
          <span className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-1">Points Fidélité</span>
          <span className="text-2xl font-black text-primary italic">0</span>
        </div>
        <div className="bg-card-bg p-5 rounded-3xl border border-border-light shadow-sm text-center">
          <span className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-1">Économies</span>
          <span className="text-2xl font-black text-text-primary">0.00 <span className="text-xs">CHF</span></span>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] ml-4 mb-3">Compte & Sécurité</h3>
          <div className="bg-card-bg rounded-[2rem] border border-border-light overflow-hidden shadow-sm p-4">
            {!isEditing ? (
              <div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Prénom</p>
                  <p className="text-sm font-bold text-text-primary">{profile?.firstName || '—'}</p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Nom</p>
                  <p className="text-sm font-bold text-text-primary">{profile?.lastName || '—'}</p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Téléphone</p>
                  <p className="text-sm font-bold text-text-primary">{profile?.phone || '—'}</p>
                </div>
                <div className="mb-4">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Email</p>
                  <p className="text-sm font-bold text-text-primary">{profile?.email || '—'}</p>
                </div>
                <button onClick={handleEditClick} className="w-full py-3 mt-2 rounded-2xl bg-primary text-white font-bold text-sm transition-all">
                  Modifier mes informations
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input type="text" placeholder="Prénom" value={editForm.firstName}
                  onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                <input type="text" placeholder="Nom" value={editForm.lastName}
                  onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                <input type="tel" placeholder="Téléphone" value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl border border-border dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
                <div className="flex gap-3">
                  <button onClick={handleSave} className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm transition-all">
                    Sauvegarder
                  </button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-2xl bg-app-bg text-text-secondary font-bold text-sm transition-all">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button onClick={handleResetPassword} className="w-full py-4 rounded-3xl bg-card-bg text-text-secondary font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-border-light">
          <Lock size={16} /> Réinitialiser mon mot de passe
        </button>

        <button onClick={handleLogout} className="w-full py-4 rounded-3xl bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest active:scale-[0.98] transition-all">
          Se déconnecter
        </button>
      </div>
    </main>
  );
}
