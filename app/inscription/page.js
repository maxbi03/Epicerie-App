'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
const STRENGTH_LABELS = ['', 'Trop faible', 'Faible', 'Moyen', 'Fort'];

export default function InscriptionPage() {
  const [form, setForm] = useState({
    firstname: '', lastname: '', email: '',
    phone: '', password: '', passwordConfirm: '',
    address: '', city: '', npa: '', terms: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const strength = getStrength(form.password);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  }

  async function handleRegister() {
    setError('');
    if (!form.firstname || !form.lastname) { setError('Prénom et nom obligatoires.'); return; }
    if (!form.email.includes('@')) { setError('Email invalide.'); return; }
    if (!form.phone.startsWith('+')) { setError('Format requis : +41 79 123 45 67'); return; }
    if (form.password.length < 10) { setError('Mot de passe : 10 caractères minimum.'); return; }
    if (strength < 2) { setError('Mot de passe trop faible.'); return; }
    if (form.password !== form.passwordConfirm) { setError('Les mots de passe ne correspondent pas.'); return; }
    if (!form.terms) { setError('Acceptez les conditions d\'utilisation.'); return; }

    setLoading(true);
    try {
      // TODO : remplacer par Pocketbase Auth (semaine 4)
      // await pb.collection('users').create({ email, password, ... })
      // await pb.collection('users').requestVerification(email)
      alert('Inscription simulée — branchement Pocketbase à venir !');
    } catch (err) {
      setError(err?.message || 'Erreur lors de l\'inscription.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col p-6 max-w-md mx-auto overflow-y-auto">

      <div className="flex items-center gap-4 mt-4 mb-8">
        <Link href="/" className="p-2 rounded-full bg-white dark:bg-white/5 text-gray-900 dark:text-white shadow">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold dark:text-white">Créer mon compte</h1>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <input type="text" placeholder="Prénom" value={form.firstname} onChange={set('firstname')}
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
            <input type="text" placeholder="Nom" value={form.lastname} onChange={set('lastname')}
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
          </div>

          <input type="email" placeholder="Email" value={form.email} onChange={set('email')}
            className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />

          <div className="space-y-2">
            <p className="text-[10px] font-black text-green-600 uppercase ml-2 tracking-widest">Adresse suisse</p>
            <input type="text" placeholder="Adresse complète" value={form.address} onChange={set('address')}
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
            <div className="grid grid-cols-3 gap-3">
              <input type="text" placeholder="NPA" value={form.npa} onChange={set('npa')}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-white text-sm" />
              <input type="text" placeholder="Localité" value={form.city} onChange={set('city')}
                className="col-span-2 w-full px-4 py-4 rounded-2xl border border-gray-200 dark:bg-white/5 dark:border-white/10 dark:text-white text-sm" />
            </div>
          </div>

          <input type="tel" placeholder="+41 79 123 45 67" value={form.phone} onChange={set('phone')}
            className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />

          <div className="space-y-2">
            <input type="password" placeholder="Mot de passe (10 car. min.)" value={form.password} onChange={set('password')}
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />
            <div className="flex gap-1 px-1">
              {[1,2,3,4].map(i => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-gray-200 dark:bg-white/10'}`} />
              ))}
            </div>
            {form.password.length > 0 && (
              <p className="text-[10px] text-gray-400 px-1">{STRENGTH_LABELS[strength]}</p>
            )}
          </div>

          <input type="password" placeholder="Confirmer le mot de passe" value={form.passwordConfirm} onChange={set('passwordConfirm')}
            className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm" />

          <div className="flex items-center gap-2">
            <input type="checkbox" id="terms" checked={form.terms} onChange={set('terms')}
              className="h-4 w-4 rounded accent-green-600" />
            <label htmlFor="terms" className="text-xs text-gray-600 dark:text-gray-300">
              J'accepte les conditions d'utilisation
            </label>
          </div>

          {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}

          <button onClick={handleRegister} disabled={loading}
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-60">
            {loading ? 'Inscription…' : 'Finaliser l\'inscription'}
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Déjà inscrit ?{' '}
            <Link href="/" className="text-green-600 font-bold">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}