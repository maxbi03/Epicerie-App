'use client';

import { supabase } from './lib/supabaseClient';
import { createUserProfile } from './lib/userService';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, MessageCircle, CheckCircle } from 'lucide-react';

function clearVisitorMode() {
  try { sessionStorage.removeItem('app_mode'); } catch {}
}

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

export default function IndexPage() {
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [form, setForm] = useState({
    firstname: '', lastname: '', email: '',
    address: '', npa: '', city: '',
    phone: '', password: '', passwordConfirm: '',
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [resendReady, setResendReady] = useState(false);
  const otpRefs = useRef([]);
  const strength = getStrength(form.password);

  useEffect(() => {
    const skip = sessionStorage.getItem('skip_splash_once') === '1';
    if (skip) {
      sessionStorage.removeItem('skip_splash_once');
      setSplashDone(true);
      return;
    }
    let p = 0;
    const interval = setInterval(() => {
      p = Math.min(p + Math.random() * 18 + 6, 92);
      setProgress(Math.round(p));
      if (p >= 92) clearInterval(interval);
    }, 140);
    setTimeout(() => {
      setProgress(100);
      setTimeout(() => setSplashDone(true), 180);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    let t;
    if (step === 2) {
      setResendCountdown(30);
      setResendReady(false);
      const interval = setInterval(() => {
        setResendCountdown(c => {
          if (c <= 1) { clearInterval(interval); setResendReady(true); return 0; }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, modalOpen]);

  function setField(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function openModal() {
    setModalOpen(true);
    setStep(1);
    setForm({ firstname: '', lastname: '', email: '', address: '', npa: '', city: '', phone: '', password: '', passwordConfirm: '' });
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
  }

  async function handleLogin() {
    setLoginError('');
    if (!loginEmail || !loginPassword) { setLoginError('Email et mot de passe requis.'); return; }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      clearVisitorMode();
      router.push('/home');
    } catch (err) {
      setLoginError('Identifiants incorrects.');
    }
  }

  async function goToStep2() {
    if (!form.firstname || !form.lastname) { alert('Prénom et nom obligatoires.'); return; }
    if (!form.email.includes('@')) { alert('Email invalide.'); return; }
    if (!form.phone.startsWith('+')) { alert('Format requis : +41 79 123 45 67'); return; }
    if (form.password.length < 10) { alert('Mot de passe : 10 caractères minimum.'); return; }
    if (getStrength(form.password) < 2) { alert('Mot de passe trop faible.'); return; }
    if (form.password !== form.passwordConfirm) { alert('Les mots de passe ne correspondent pas.'); return; }

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: form.phone });
      if (error) throw error;
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      alert('Erreur envoi SMS : ' + err.message);
    }
  }

  async function verifyOtpAndRegister() {
    const token = otp.join('');
    if (token.length !== 6) { setOtpError('Entrez les 6 chiffres du code.'); return; }
    setOtpError('');

    try {
      const { error: otpError } = await supabase.auth.verifyOtp({
        phone: form.phone,
        token,
        type: 'sms',
      });
      if (otpError) throw otpError;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (signUpError) throw signUpError;

      await createUserProfile({
        id: data.user.id,
        name: `${form.firstname} ${form.lastname}`.trim(),
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        postal_code: form.npa,
        country: 'CH',
        address_verified: false,
        phone_verified: true,
      });

      setStep(3);
      setTimeout(() => { setModalOpen(false); router.push('/home'); }, 2500);
    } catch (err) {
      setOtpError(err?.message || 'Code incorrect ou expiré.');
    }
  }

  function handleOtpChange(index, value) {
    const cleaned = value.replace(/\D/g, '').slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    text.split('').forEach((c, i) => { if (i < 6) newOtp[i] = c; });
    setOtp(newOtp);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  }

  const stepDotClass = (n) => n <= step
    ? 'size-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-black transition-all'
    : 'size-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-400 text-xs font-black transition-all';

  const stepBarClass = (n) => n < step
    ? 'flex-1 h-1 rounded-full bg-green-600 transition-all'
    : 'flex-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 transition-all';

  return (
    <>
      {!splashDone && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-gradient-to-b from-green-50 to-green-100 dark:from-green-950 dark:to-gray-950">
          <div className="w-full max-w-[22rem] text-center">
            <div className="size-28 rounded-[2rem] bg-green-800 flex items-center justify-center mx-auto mb-5 shadow-2xl">
              <span className="text-white text-4xl font-black">É</span>
            </div>
            <p className="text-[11px] font-black tracking-[0.22em] uppercase text-green-700 dark:text-green-400 opacity-80">Ouverture</p>
            <h1 className="mt-2 text-[1.9rem] font-black text-green-900 dark:text-white tracking-tight leading-tight">L'Épicerie</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Village connecté</p>
            <div className="mt-8 h-2.5 w-full rounded-full bg-green-200/50 dark:bg-white/10 overflow-hidden border border-green-200/30">
              <div className="h-full rounded-full bg-green-700 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-3 text-[11px] font-black tracking-[0.16em] uppercase text-gray-400">
              Chargement... {progress}%
            </p>
          </div>
        </div>
      )}

      <div className={`min-h-screen flex flex-col p-6 max-w-md mx-auto transition-all duration-500 ${splashDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>

        <div className="flex justify-end mt-4">
          <button
            onClick={() => { sessionStorage.setItem('app_mode', 'visitor'); router.push('/home'); }}
            className="text-sm font-bold text-green-600 px-4 py-2 rounded-full border border-green-200 hover:bg-green-50 transition-colors flex items-center gap-2"
          >
            Mode Visiteur →
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-10">

          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Déjà client ?</h2>
              <p className="text-sm text-gray-500">Connectez-vous pour accéder au magasin</p>
            </div>
            <div className="space-y-4" data-lpignore="true">
              <input 
                type="email" autoComplete="username"
                placeholder="Adresse email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500 transition"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500 transition"
              />
              {loginError && <p className="text-sm text-red-500 text-center">{loginError}</p>}
              <button onClick={handleLogin} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all">
                Se connecter
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-gray-200 dark:bg-white/10" />

          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nouveau ici ?</h2>
              <p className="text-sm text-gray-500 px-4">Créez votre compte pour accéder à l'épicerie autonome.</p>
            </div>
            <button onClick={openModal} className="w-full bg-green-100 text-green-700 font-bold py-4 rounded-2xl hover:brightness-95 active:scale-95 transition-all">
              S'inscrire
            </button>
          </div>
        </div>

        <p className="text-[10px] text-center text-gray-400 pb-4 mt-8">
          Vérification d'identité requise pour la sécurité de l'épicerie autonome.
        </p>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">

            <div className="px-8 pt-8 pb-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold dark:text-white">
                  {step === 1 ? 'Créer un compte' : step === 2 ? 'Vérification SMS' : 'Compte activé'}
                </h2>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className={stepDotClass(1)}>{step > 1 ? <Check size={14} /> : '1'}</div>
                  <div className={stepBarClass(1)} />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className={stepDotClass(2)}>{step > 2 ? <Check size={14} /> : '2'}</div>
                  <div className={stepBarClass(2)} />
                </div>
                <div className={stepDotClass(3)}>3</div>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[70vh] px-8 pb-8">

              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Prénom" value={form.firstname} onChange={setField('firstname')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                    <input type="text" placeholder="Nom" value={form.lastname} onChange={setField('lastname')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-green-600 uppercase ml-2 tracking-widest">Adresse suisse</p>
                    <input type="text" placeholder="Adresse complète" value={form.address} onChange={setField('address')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                    <div className="grid grid-cols-3 gap-3">
                      <input type="text" placeholder="NPA" value={form.npa} onChange={setField('npa')}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none" />
                      <input type="text" placeholder="Localité" value={form.city} onChange={setField('city')}
                        className="col-span-2 w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-green-600 uppercase ml-2 tracking-widest">Identifiants</p>
                    <input type="email" placeholder="Adresse email" value={form.email} onChange={setField('email')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                  </div>

                  <div className="space-y-2">
                    <input type="password" placeholder="Code secret (10 car. min.)" value={form.password} onChange={setField('password')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                    <div className="flex gap-1 px-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? STRENGTH_COLORS[strength] : 'bg-gray-200 dark:bg-white/10'}`} />
                      ))}
                    </div>
                    {form.password.length > 0 && <p className="text-[10px] text-gray-400 px-1">{STRENGTH_LABELS[strength]}</p>}
                    <input type="password" placeholder="Confirmer le code secret" value={form.passwordConfirm} onChange={setField('passwordConfirm')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Vérification SMS <span className="text-red-400">· obligatoire</span></p>
                    <input type="tel" placeholder="+41 79 123 45 67" value={form.phone} onChange={setField('phone')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                    <p className="text-[10px] text-gray-400 px-2">Format international requis : +41 pour la Suisse</p>
                  </div>

                  <button onClick={goToStep2} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all">
                    Continuer →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="size-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><MessageCircle size={28} className="text-green-600" /></div>
                    <h3 className="font-bold text-green-900 dark:text-white text-lg">Code envoyé !</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Un code à 6 chiffres a été envoyé au<br />
                      <span className="font-bold text-green-900 dark:text-white">
                        {form.phone.slice(0, -4).replace(/\d/g, '•') + form.phone.slice(-4)}
                      </span>
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className="size-12 rounded-2xl border-2 border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-center text-xl font-black focus:border-green-500 outline-none transition"
                      />
                    ))}
                  </div>

                  {otpError && <p className="text-center text-sm text-red-500 font-medium">{otpError}</p>}

                  <button onClick={verifyOtpAndRegister} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all">
                    Vérifier le code
                  </button>

                  <div className="text-center">
                    <button disabled={!resendReady} onClick={goToStep2}
                      className={`text-sm font-bold transition-colors ${resendReady ? 'text-green-600' : 'text-gray-300 dark:text-gray-600'}`}>
                      {resendReady ? 'Renvoyer le code' : `Renvoyer le code (${resendCountdown}s)`}
                    </button>
                  </div>

                  <button onClick={() => setStep(1)} className="w-full text-sm text-gray-400 font-medium flex items-center justify-center gap-1 hover:text-gray-600 transition-colors">
                    ← Modifier mon numéro
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="text-center space-y-6 py-4">
                  <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle size={36} className="text-green-600" /></div>
                  <div>
                    <h3 className="text-xl font-black text-green-900 dark:text-white">Compte créé !</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Bienvenue dans l'épicerie autonome.<br />Vous allez être redirigé…
                    </p>
                  </div>
                  <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
