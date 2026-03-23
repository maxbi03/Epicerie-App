'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Link2, CheckCircle } from 'lucide-react';

const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
const STRENGTH_LABELS = ['', 'Trop faible', 'Faible', 'Moyen', 'Fort'];

function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

export default function ResetPage() {
  const [state, setState] = useState('form');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);

  async function handleSubmit() {
    setError('');

    if (password.length < 10) {
      setError('Le code secret doit contenir au moins 10 caractères.');
      return;
    }
    if (strength < 2) {
      setError('Code trop faible. Ajoutez des chiffres ou des majuscules.');
      return;
    }
    if (password !== confirm) {
      setError('Les codes secrets ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      // TODO : remplacer par Pocketbase auth lors de la migration
      // await pb.collection('users').authWithPassword(...)
      await new Promise(r => setTimeout(r, 1000));
      setState('success');
      setTimeout(() => { window.location.href = '/'; }, 2500);
    } catch (err) {
      setError(err?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 max-w-md mx-auto">

      <div className="text-center mb-8">
        <div className="size-16 rounded-[1.2rem] bg-green-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white text-2xl font-black">É</span>
        </div>
        <h1 className="text-2xl font-black text-green-900 dark:text-white">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choisissez un code secret fort</p>
      </div>

      {state === 'form' && (
        <div className="space-y-5">

          <div className="space-y-2">
            <p className="text-[10px] font-black text-green-600 uppercase ml-2 tracking-widest">Nouveau code secret</p>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="10 caractères minimum"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="flex gap-1 px-1">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i <= strength ? STRENGTH_COLORS[strength] : 'bg-gray-200 dark:bg-white/10'
                  }`}
                />
              ))}
            </div>
            {password.length > 0 && (
              <p className="text-[10px] text-gray-400 px-1">{STRENGTH_LABELS[strength]}</p>
            )}
          </div>

          <input
            type="password"
            placeholder="Confirmer le code secret"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500 transition"
          />

          {error && (
            <p className="text-sm text-red-500 text-center font-medium">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </div>
      )}

      {state === 'invalid' && (
        <div className="text-center space-y-4">
          <div className="size-16 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Link2 size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Lien invalide ou expiré</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ce lien de réinitialisation n'est plus valide.<br />
            Faites une nouvelle demande depuis votre profil.
          </p>
          <Link href="/" className="inline-block mt-4 bg-green-600 text-white font-bold px-8 py-3 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all">
            Retour à la connexion
          </Link>
        </div>
      )}

      {state === 'success' && (
        <div className="text-center space-y-4">
          <div className="size-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-green-900 dark:text-white">Mot de passe mis à jour !</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Vous allez être redirigé vers la connexion…</p>
          <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      )}

    </div>
  );
}