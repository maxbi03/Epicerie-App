'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check, CheckCircle, MapPin } from 'lucide-react';
import { getStrength, STRENGTH_COLORS, STRENGTH_LABELS } from './lib/password';

function clearVisitorMode() {
  try { sessionStorage.removeItem('app_mode'); } catch (e) { console.warn('clearVisitorMode:', e); }
}

const OTP_PENDING_KEY    = 'pending_otp_registration';
const PENDING_REG_TTL_MS = 30 * 60 * 1000; // 30 min = durée du cookie pending_registration

export default function IndexPage() {
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimer = useRef(null);
  const otpInputRefs = useRef([]);
  const [addressFromTopo, setAddressFromTopo] = useState(false);
  const [form, setForm] = useState({
    firstname: '', lastname: '', email: '',
    address: '', npa: '', city: '',
    phone: '', password: '', passwordConfirm: '',
  });
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const addressDebounce = useRef(null);
  const strength = getStrength(form.password);

  useEffect(() => {
    const skip = sessionStorage.getItem('skip_splash_once') === '1';
    if (skip) {
      sessionStorage.removeItem('skip_splash_once');
      setSplashDone(true);
      return;
    }
    // Logo apparaît avec spring
    setTimeout(() => setLogoVisible(true), 80);
    // Portes s'ouvrent
    setTimeout(() => setDoorOpen(true), 950);
    // Overlay retiré après que les portes soient hors champ
    setTimeout(() => setSplashDone(true), 1750);
  }, []);

  // Restaure l'étape OTP si l'app a redémarré pendant la vérification SMS
  useEffect(() => {
    if (!splashDone) return;
    try {
      const raw = localStorage.getItem(OTP_PENDING_KEY);
      if (!raw) return;
      const { phone, sentAt } = JSON.parse(raw);
      // Ignorer si le code OTP a expiré (> 10 min)
      if (Date.now() - sentAt > PENDING_REG_TTL_MS) {
        localStorage.removeItem(OTP_PENDING_KEY);
        return;
      }
      setForm(f => ({ ...f, phone }));
      setModalOpen(true);
      setStep(2);
      // Recalculer le cooldown restant sur le bouton "Renvoyer"
      const elapsed = Math.floor((Date.now() - sentAt) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      if (remaining > 0) {
        setResendCooldown(remaining);
        clearInterval(resendTimer.current);
        resendTimer.current = setInterval(() => {
          setResendCooldown(v => {
            if (v <= 1) { clearInterval(resendTimer.current); return 0; }
            return v - 1;
          });
        }, 1000);
      }
    } catch (e) { console.warn('[splash] restore OTP state:', e); }
  }, [splashDone]);

  function setField(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  function openModal() {
    try { localStorage.removeItem(OTP_PENDING_KEY); } catch (e) { console.warn(e); }
    setModalOpen(true);
    setStep(1);
    setRegisterError('');
    setOtpCode('');
    setOtpError('');
    setResendCooldown(0);
    setAddressFromTopo(false);
    setAddressQuery('');
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setForm({ firstname: '', lastname: '', email: '', address: '', npa: '', city: '', phone: '', password: '', passwordConfirm: '' });
  }

  function closeModal() {
    try { localStorage.removeItem(OTP_PENDING_KEY); } catch (e) { console.warn(e); }
    setModalOpen(false);
  }

  function startResendCooldown() {
    setResendCooldown(30);
    clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendCooldown(v => {
        if (v <= 1) { clearInterval(resendTimer.current); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  async function sendOtp() {
    const res = await fetch('/api/auth/verify-phone/send', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erreur envoi SMS');
    startResendCooldown();
  }

  async function handleVerifyOtp() {
    setOtpError('');
    if (otpCode.length !== 6) { setOtpError('Le code est à 6 chiffres.'); return; }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Code incorrect');
      try { localStorage.removeItem(OTP_PENDING_KEY); } catch (e) { console.warn(e); }
      setStep(3);
      setTimeout(() => { setModalOpen(false); router.push('/home'); }, 2500);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpLoading(false);
    }
  }

  function handleAddressInput(e) {
    const val = e.target.value;
    setAddressQuery(val);
    setAddressFromTopo(false);
    setForm(f => ({ ...f, address: val }));
    clearTimeout(addressDebounce.current);
    if (val.length < 3) { setAddressSuggestions([]); setShowSuggestions(false); return; }
    addressDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setAddressSuggestions(data.suggestions ?? []);
        setShowSuggestions(true);
      } catch (e) { console.warn('[address suggestions]', e); }
    }, 300);
  }

  function selectAddress(s) {
    setAddressQuery(s.street);
    setAddressFromTopo(true);
    setForm(f => ({ ...f, address: s.street, npa: s.postalCode, city: s.city }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleLogin() {
    setLoginError('');
    if (!loginEmail || !loginPassword) { setLoginError('Email et mot de passe requis.'); return; }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur serveur.');
      clearVisitorMode();
      router.push('/home');
    } catch (err) {
      setLoginError(err.message || 'Identifiants incorrects.');
    }
  }

  async function handleRegister() {
    setRegisterError('');
    if (!form.firstname || !form.lastname) { setRegisterError('Prénom et nom obligatoires.'); return; }
    if (!form.email.includes('@')) { setRegisterError('Email invalide.'); return; }
    if (!form.phone.trim()) { setRegisterError('Numéro de téléphone obligatoire pour vérifier votre identité.'); return; }
    if (form.password.length < 10) { setRegisterError('Mot de passe : 10 caractères minimum.'); return; }
    if (getStrength(form.password) < 2) { setRegisterError('Mot de passe trop faible.'); return; }
    if (form.password !== form.passwordConfirm) { setRegisterError('Les mots de passe ne correspondent pas.'); return; }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.firstname} ${form.lastname}`.trim(),
          email: form.email,
          phone: form.phone,
          password: form.password,
          address: form.address || null,
          postal_code: form.npa || null,
          city: form.city || null,
          country: 'CH',
          address_from_topo: addressFromTopo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur serveur. Vérifiez la console.');

      // Envoyer le SMS OTP
      await sendOtp();
      // Persister l'état pour survivre à un redémarrage du navigateur/de l'app
      try {
        localStorage.setItem(OTP_PENDING_KEY, JSON.stringify({ phone: form.phone, sentAt: Date.now() }));
      } catch (e) { console.warn('[localStorage OTP save]', e); }
      setStep(2);
    } catch (err) {
      setRegisterError(err.message || "Erreur lors de l'inscription.");
    }
  }

  const stepDotClass = (n) => n <= step
    ? 'size-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-black transition-all'
    : 'size-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-400 text-xs font-black transition-all';

  const stepBarClass = (n) => n < step
    ? 'flex-1 h-1 rounded-full bg-green-600 transition-all'
    : 'flex-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 transition-all';

  return (
    <>
      {!splashDone && (
        <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">

          {/* ── Panneau gauche ── */}
          {/* ── Panneau gauche — bord droit = même couleur que bord gauche du droit ── */}
          <div
            className="absolute left-0 top-0 h-full w-1/2"
            style={{
              background: 'linear-gradient(to right, #263d12 0%, #3a5519 100%)',
              transform: doorOpen ? 'translateX(-101%)' : 'translateX(0)',
              transition: 'transform 0.72s cubic-bezier(0.7, 0, 0.3, 1)',
            }}
          />

          {/* ── Panneau droit — bord gauche = même couleur que bord droit du gauche ── */}
          <div
            className="absolute right-0 top-0 h-full w-1/2"
            style={{
              background: 'linear-gradient(to left, #263d12 0%, #3a5519 100%)',
              transform: doorOpen ? 'translateX(101%)' : 'translateX(0)',
              transition: 'transform 0.72s cubic-bezier(0.7, 0, 0.3, 1)',
            }}
          />

          {/* ── Logo centré, s'évapore à l'ouverture ── */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center select-none"
            style={{
              opacity: logoVisible ? (doorOpen ? 0 : 1) : 0,
              transform: `scale(${logoVisible ? (doorOpen ? 1.06 : 1) : 0.86})`,
              transition: logoVisible
                ? doorOpen
                  ? 'opacity 0.3s ease-in, transform 0.3s ease-in'
                  : 'opacity 0.45s ease-out, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'none',
            }}
          >
            {/* Icône */}
            <div
              style={{
                width: 96, height: 96,
                borderRadius: 28,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <span style={{ color: '#fff', fontSize: 40, fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.3)', lineHeight: 1 }}>É</span>
            </div>

            {/* Texte */}
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 900, letterSpacing: '0.34em', textTransform: 'uppercase', marginBottom: 6 }}>
              Village Connecté
            </p>
            <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', textShadow: '0 2px 16px rgba(0,0,0,0.25)', lineHeight: 1 }}>
              L&apos;Épicerie
            </h1>
          </div>

        </div>
      )}

      <div className={`h-full flex flex-col p-6 max-w-md mx-auto overflow-y-auto transition-all duration-500 ${splashDone ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>

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
                  {step === 1 ? 'Créer un compte' : step === 2 ? 'Vérification' : 'Compte activé'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="flex items-center gap-2">
                <div className={stepDotClass(1)}>{step > 1 ? <Check size={12} /> : '1'}</div>
                <div className={stepBarClass(1)} />
                <div className={stepDotClass(2)}>{step > 2 ? <Check size={12} /> : '2'}</div>
                <div className={stepBarClass(2)} />
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
                    <div className="relative">
                      <div className="relative">
                        <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Rechercher une adresse suisse..."
                          value={addressQuery}
                          onChange={handleAddressInput}
                          onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                          autoComplete="off"
                          className="w-full pl-10 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500"
                        />
                      </div>
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-white/10 shadow-xl overflow-hidden">
                          {addressSuggestions.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onMouseDown={() => selectAddress(s)}
                              className="w-full px-4 py-3 text-left text-sm text-gray-800 dark:text-gray-200 hover:bg-green-50 dark:hover:bg-white/5 border-b last:border-0 border-gray-100 dark:border-white/5 transition-colors"
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                    <p className="text-[10px] font-black text-green-600 uppercase ml-2 tracking-widest">Téléphone · vérification par SMS</p>
                    <input type="tel" placeholder="+41 79 123 45 67" value={form.phone} onChange={setField('phone')}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-white text-sm outline-none focus:border-green-500" />
                  </div>

                  {registerError && <p className="text-sm text-red-500 text-center">{registerError}</p>}

                  <button onClick={handleRegister} className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all">
                    Créer mon compte →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 py-2">
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">Vérifiez votre téléphone</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Un code à 6 chiffres a été envoyé au<br />
                      <span className="font-bold text-green-600">{form.phone}</span>
                    </p>
                  </div>

                  <div className="flex justify-center gap-2">
                    {[0,1,2,3,4,5].map(i => (
                      <input
                        key={i}
                        ref={el => { otpInputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otpCode[i] || ''}
                        onChange={e => {
                          const digit = e.target.value.replace(/\D/g, '').slice(-1);
                          const arr = otpCode.padEnd(6, ' ').split('');
                          arr[i] = digit;
                          setOtpCode(arr.join('').trimEnd());
                          if (digit && i < 5) otpInputRefs.current[i + 1]?.focus();
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace' && !otpCode[i] && i > 0) {
                            const arr = otpCode.padEnd(6, ' ').split('');
                            arr[i - 1] = '';
                            setOtpCode(arr.join('').trimEnd());
                            otpInputRefs.current[i - 1]?.focus();
                          }
                          if (e.key === 'Enter') handleVerifyOtp();
                        }}
                        onPaste={e => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                          setOtpCode(pasted);
                          otpInputRefs.current[Math.min(pasted.length, 5)]?.focus();
                        }}
                        className={`size-12 rounded-2xl border-2 text-center text-xl font-black outline-none transition-all dark:bg-white/5 dark:text-white ${
                          otpCode[i]
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-700'
                            : 'border-gray-200 dark:border-white/10 focus:border-green-400'
                        }`}
                      />
                    ))}
                  </div>

                  {otpError && <p className="text-sm text-red-500 text-center">{otpError}</p>}

                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpLoading || otpCode.length !== 6}
                    className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
                  >
                    {otpLoading ? 'Vérification…' : 'Confirmer le code →'}
                  </button>

                  <button
                    onClick={async () => { setOtpError(''); try { await sendOtp(); } catch (e) { setOtpError(e.message); } }}
                    disabled={resendCooldown > 0}
                    className="w-full text-sm text-gray-500 dark:text-gray-400 py-2 disabled:opacity-50 transition-opacity"
                  >
                    {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="text-center space-y-6 py-4">
                  <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={36} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-green-900 dark:text-white">Compte activé !</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Téléphone vérifié.<br />Bienvenue dans l'épicerie autonome.
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
