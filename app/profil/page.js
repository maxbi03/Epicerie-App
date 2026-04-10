'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User, Camera, Trash2, Check, ChevronRight,
  MapPin, Phone, Mail, Lock, AlertTriangle, Moon, Sun,
  ShieldCheck, ShieldAlert, Eye, EyeOff, LogOut,
} from 'lucide-react';
import { getStrength, STRENGTH_COLORS, STRENGTH_LABELS } from '../lib/password';

// ─── Helpers ────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function avatarBg(name = '') {
  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1 mb-2">{title}</p>
      <div className="bg-card-bg rounded-[1.75rem] border border-border-light shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, badge, onClick, danger }) {
  const content = (
    <>
      <div className={`shrink-0 size-8 rounded-xl flex items-center justify-center ${danger ? 'bg-red-50' : 'bg-primary-light'}`}>
        <Icon size={15} className={danger ? 'text-red-500' : 'text-primary'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? 'text-red-600' : 'text-text-primary'}`}>{label}</p>
        {value && <p className="text-xs text-text-muted truncate mt-0.5">{value}</p>}
      </div>
      {badge}
      {onClick && !danger && <ChevronRight size={14} className="text-text-muted shrink-0" />}
    </>
  );

  if (!onClick) {
    return (
      <div className="w-full flex items-center gap-3 px-5 py-4 border-b last:border-0 border-border-light">
        {content}
      </div>
    );
  }
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors active:bg-black/5 dark:active:bg-white/5 border-b last:border-0 border-border-light`}>
      {content}
    </button>
  );
}

function Badge({ verified }) {
  return verified
    ? <span className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full shrink-0"><ShieldCheck size={10} /> Vérifié</span>
    : <span className="flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full shrink-0"><ShieldAlert size={10} /> Non vérifié</span>;
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function ProfilPage() {
  const router = useRouter();
  const fileInputRef    = useRef(null);
  const phoneOtpRefs    = useRef([]);
  const phoneResendTimer = useRef(null);

  const [loading, setLoading]     = useState(true);
  const [isVisitor, setIsVisitor] = useState(false);
  const [profile, setProfile]     = useState(null);
  const [darkMode, setDarkMode]   = useState(false);

  // Panneau actif : null | 'phone' | 'address' | 'password' | 'delete'
  const [panel, setPanel] = useState(null);

  // ── Avatar
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError]     = useState('');

  // ── Changement de numéro (2 étapes)
  const [phoneStep, setPhoneStep]             = useState(1); // 1=saisie numéro, 2=OTP
  const [newPhoneInput, setNewPhoneInput]     = useState('');
  const [phoneOtpCode, setPhoneOtpCode]       = useState('');
  const [phoneLoading, setPhoneLoading]       = useState(false);
  const [phoneError, setPhoneError]           = useState('');
  const [phoneSuccess, setPhoneSuccess]       = useState(false);
  const [phoneResendCooldown, setPhoneResendCooldown] = useState(0);

  // ── Adresse
  const [addrForm, setAddrForm]         = useState({ address: '', npa: '', city: '' });
  const [addrQuery, setAddrQuery]       = useState('');
  const [addrSuggestions, setAddrSugg]  = useState([]);
  const [showAddrSugg, setShowAddrSugg] = useState(false);
  const addrDebounce                    = useRef(null);
  const [addrVerified, setAddrVerified] = useState(false);
  const [addrSaving, setAddrSaving]     = useState(false);
  const [addrError, setAddrError]       = useState('');
  const [addrSuccess, setAddrSuccess]   = useState(false);

  // ── Mot de passe
  const [pwdForm, setPwdForm]   = useState({ current: '', next: '', confirm: '' });
  const [pwdSaving, setPwdSaving]   = useState(false);
  const [pwdError, setPwdError]     = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [showPwd, setShowPwd]       = useState({ current: false, next: false, confirm: false });

  // ── Suppression compte
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading]   = useState(false);
  const [deleteError, setDeleteError]       = useState('');
  const [deleteConfirm, setDeleteConfirm]   = useState(false);

  // ── Chargement ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const visitor = sessionStorage.getItem('app_mode') === 'visitor';
    setIsVisitor(visitor);
    if (!visitor) loadProfile();
    else setLoading(false);

    const saved = localStorage.getItem('theme');
    const prefersDark = saved === 'dark'; // mode clair par défaut si rien de sauvegardé
    setDarkMode(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { router.push('/'); return; }
      const { user } = await res.json();
      setProfile(user);
      setAddrForm({ address: user.address || '', npa: user.postal_code || '', city: user.city || '' });
      setAddrQuery(user.address || '');
      setAddrVerified((user.address_verified ?? 0) >= 1);
    } catch {
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  // ── Dark mode ────────────────────────────────────────────────────────────────

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  // ── Avatar ───────────────────────────────────────────────────────────────────

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch('/api/users/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(p => ({ ...p, avatar_url: data.avatar_url }));
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  }

  async function handleAvatarDelete() {
    setAvatarError('');
    setAvatarLoading(true);
    try {
      const res = await fetch('/api/users/avatar', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setProfile(p => ({ ...p, avatar_url: null }));
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarLoading(false);
    }
  }

  // ── Changement de numéro ─────────────────────────────────────────────────────

  function openPhonePanel() {
    setPanel(p => p === 'phone' ? null : 'phone');
    setPhoneStep(1);
    setNewPhoneInput('');
    setPhoneOtpCode('');
    setPhoneError('');
    setPhoneSuccess(false);
    setPhoneResendCooldown(0);
  }

  function startPhoneResendCooldown() {
    setPhoneResendCooldown(30);
    clearInterval(phoneResendTimer.current);
    phoneResendTimer.current = setInterval(() => {
      setPhoneResendCooldown(v => {
        if (v <= 1) { clearInterval(phoneResendTimer.current); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  async function sendPhoneChangeOtp() {
    setPhoneError('');
    if (!newPhoneInput.trim()) { setPhoneError('Numéro de téléphone requis.'); return; }
    setPhoneLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPhone: newPhoneInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhoneStep(2);
      setPhoneOtpCode('');
      startPhoneResendCooldown();
      setTimeout(() => phoneOtpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setPhoneError(err.message);
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyPhoneChange() {
    setPhoneError('');
    if (phoneOtpCode.length !== 6) { setPhoneError('Code à 6 chiffres requis.'); return; }
    setPhoneLoading(true);
    try {
      const res = await fetch('/api/auth/verify-phone/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneOtpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(p => ({ ...p, phone: newPhoneInput.trim(), phone_verified: true }));
      setPhoneSuccess(true);
      setTimeout(() => { setPhoneSuccess(false); setPanel(null); }, 2000);
    } catch (err) {
      setPhoneError(err.message);
    } finally {
      setPhoneLoading(false);
    }
  }

  // ── Adresse ──────────────────────────────────────────────────────────────────

  function handleAddrInput(e) {
    const val = e.target.value;
    setAddrQuery(val);
    setAddrVerified(false);
    setAddrForm(f => ({ ...f, address: val }));
    clearTimeout(addrDebounce.current);
    if (val.length < 3) { setAddrSugg([]); setShowAddrSugg(false); return; }
    addrDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-search?q=${encodeURIComponent(val)}`);
        const d = await res.json();
        setAddrSugg(d.suggestions ?? []);
        setShowAddrSugg(true);
      } catch (e) { console.warn('[address suggestions]', e); }
    }, 300);
  }

  function selectAddr(s) {
    setAddrQuery(s.street);
    setAddrVerified(true);
    setAddrForm({ address: s.street, npa: s.postalCode, city: s.city });
    setAddrSugg([]); setShowAddrSugg(false);
  }

  async function saveAddress() {
    setAddrError(''); setAddrSuccess(false);
    setAddrSaving(true);
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: addrForm.address || null,
          postal_code: addrForm.npa || null,
          city: addrForm.city || null,
          address_verified: addrVerified ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile(p => ({ ...p, address: data.address, postal_code: data.postal_code, city: data.city, address_verified: data.address_verified }));
      setAddrSuccess(true);
      setTimeout(() => { setAddrSuccess(false); setPanel(null); }, 1500);
    } catch (err) {
      setAddrError(err.message);
    } finally {
      setAddrSaving(false);
    }
  }

  // ── Mot de passe ─────────────────────────────────────────────────────────────

  async function savePassword() {
    setPwdError(''); setPwdSuccess(false);
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) { setPwdError('Tous les champs sont requis.'); return; }
    if (pwdForm.next.length < 10) { setPwdError('Nouveau mot de passe : 10 caractères minimum.'); return; }
    if (getStrength(pwdForm.next) < 2) { setPwdError('Nouveau mot de passe trop faible.'); return; }
    if (pwdForm.next !== pwdForm.confirm) { setPwdError('Les mots de passe ne correspondent pas.'); return; }
    setPwdSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwdSuccess(true);
      setPwdForm({ current: '', next: '', confirm: '' });
      setTimeout(() => { setPwdSuccess(false); setPanel(null); }, 1800);
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdSaving(false);
    }
  }

  // ── Suppression compte ───────────────────────────────────────────────────────

  async function handleDeleteAccount() {
    setDeleteError('');
    if (!deletePassword) { setDeleteError('Confirmez avec votre mot de passe.'); return; }
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await fetch('/api/auth/logout', { method: 'POST' });
      sessionStorage.clear();
      router.push('/');
    } catch (err) {
      setDeleteError(err.message);
      setDeleteLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('app_mode');
    router.push('/');
  }

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isVisitor) return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-24 h-full overflow-y-auto">
      <div className="flex flex-col items-center mb-8">
        <div className="size-24 rounded-[2rem] bg-app-bg flex items-center justify-center border-2 border-border-light shadow-xl">
          <User size={40} className="text-text-muted" />
        </div>
        <h2 className="text-2xl font-bold mt-4 text-text-primary">Visiteur</h2>
      </div>
      <div className="bg-card-bg rounded-[2rem] border border-border-light shadow-sm p-6 text-center">
        <h3 className="text-lg font-black text-text-primary mb-2">Compte requis</h3>
        <p className="text-sm text-text-secondary leading-relaxed">Créez un compte pour accéder aux fonctionnalités de l'épicerie.</p>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <Link href="/" className="py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest text-center">Se connecter</Link>
          <Link href="/" className="py-4 rounded-2xl bg-primary-light text-forest-green font-black text-xs uppercase tracking-widest text-center">Créer un compte</Link>
        </div>
      </div>
    </main>
  );

  const pwdStrength = getStrength(pwdForm.next);

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-28 h-full overflow-y-auto space-y-6">

      {/* ── Avatar + nom ──────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center pt-2">
        <button
          onClick={() => !avatarLoading && fileInputRef.current?.click()}
          className={`relative size-24 rounded-[2rem] flex items-center justify-center shadow-xl overflow-hidden border-2 border-white dark:border-white/10 active:scale-95 transition-transform ${!profile?.avatar_url ? avatarBg(profile?.name) : ''}`}
        >
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            : <span className="text-2xl font-black text-white select-none">{initials(profile?.name)}</span>
          }
          {/* Bande caméra en bas — toujours visible */}
          {!avatarLoading && (
            <div className="absolute bottom-0 left-0 right-0 h-7 bg-black/40 flex items-center justify-center gap-1">
              <Camera size={13} className="text-white" />
              <span className="text-white text-[9px] font-bold uppercase tracking-wider">Photo</span>
            </div>
          )}
          {/* Overlay chargement */}
          {avatarLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        {profile?.avatar_url && (
          <button onClick={handleAvatarDelete} className="mt-3 text-xs text-text-muted flex items-center gap-1 active:text-red-500 transition-colors">
            <Trash2 size={11} /> Supprimer la photo
          </button>
        )}
        {avatarError && <p className="text-xs text-red-500 mt-1 text-center">{avatarError}</p>}

        <h2 className="text-2xl font-bold mt-4 text-text-primary">{profile?.name || '—'}</h2>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Membre</p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card-bg p-5 rounded-3xl border border-border-light shadow-sm text-center">
          <span className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-1">Points Fidélité</span>
          <span className="text-2xl font-black text-primary italic">0</span>
        </div>
        <div className="bg-card-bg p-5 rounded-3xl border border-border-light shadow-sm text-center">
          <span className="text-[10px] font-black uppercase text-text-muted tracking-widest block mb-1">Dépenses totales</span>
          <span className="text-2xl font-black text-text-primary">
            {Number(profile?.total_spent ?? 0).toFixed(2)} <span className="text-xs">CHF</span>
          </span>
        </div>
      </div>

      {/* ── Informations personnelles ──────────────────────────────────────── */}
      <Section title="Informations personnelles">
        {/* Nom : lecture seule */}
        <Row icon={User} label="Nom complet" value={profile?.name || '—'} />
        {/* Téléphone : ouvre le panneau de changement */}
        <Row
          icon={Phone}
          label="Téléphone"
          value={profile?.phone || 'Non renseigné'}
          badge={<Badge verified={!!profile?.phone_verified} />}
          onClick={openPhonePanel}
        />
        {/* Email : lecture seule */}
        <Row icon={Mail} label="Email" value={profile?.email || '—'} badge={<Badge verified={!!profile?.email_verified} />} />
      </Section>

      {/* ── Panneau changement de numéro ───────────────────────────────────── */}
      {panel === 'phone' && (
        <div className="bg-card-bg rounded-[1.75rem] border border-border-light shadow-sm p-5 space-y-4 -mt-3">

          {phoneStep === 1 && (
            <>
              <p className="text-xs text-text-muted">Entrez votre nouveau numéro. Un SMS de vérification sera envoyé.</p>
              <input
                type="tel"
                placeholder="+41 79 123 45 67"
                value={newPhoneInput}
                onChange={e => setNewPhoneInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendPhoneChangeOtp()}
                className="w-full px-4 py-3 rounded-2xl border border-border-light border-border-light bg-input-bg text-text-primary text-sm outline-none focus:border-primary"
              />
              {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
              <div className="flex gap-2">
                <button onClick={sendPhoneChangeOtp} disabled={phoneLoading}
                  className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-60 transition-all">
                  {phoneLoading ? 'Envoi…' : 'Envoyer le code SMS →'}
                </button>
                <button onClick={() => setPanel(null)}
                  className="flex-1 py-3 rounded-2xl bg-app-bg text-text-secondary font-bold text-sm transition-all">
                  Annuler
                </button>
              </div>
            </>
          )}

          {phoneStep === 2 && (
            <>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-text-primary">Code envoyé au</p>
                <p className="text-sm font-black text-primary">{newPhoneInput}</p>
              </div>

              {/* 6 cases OTP */}
              <div className="flex justify-center gap-2">
                {[0,1,2,3,4,5].map(i => (
                  <input
                    key={i}
                    ref={el => { phoneOtpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={phoneOtpCode[i] || ''}
                    onChange={e => {
                      const digit = e.target.value.replace(/\D/g, '').slice(-1);
                      const arr = phoneOtpCode.padEnd(6, ' ').split('');
                      arr[i] = digit;
                      setPhoneOtpCode(arr.join('').trimEnd());
                      if (digit && i < 5) phoneOtpRefs.current[i + 1]?.focus();
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Backspace' && !phoneOtpCode[i] && i > 0) {
                        const arr = phoneOtpCode.padEnd(6, ' ').split('');
                        arr[i - 1] = '';
                        setPhoneOtpCode(arr.join('').trimEnd());
                        phoneOtpRefs.current[i - 1]?.focus();
                      }
                      if (e.key === 'Enter') handleVerifyPhoneChange();
                    }}
                    onPaste={e => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      setPhoneOtpCode(pasted);
                      phoneOtpRefs.current[Math.min(pasted.length, 5)]?.focus();
                    }}
                    className={`size-11 rounded-2xl border-2 text-center text-lg font-black outline-none transition-all bg-input-bg text-text-primary ${
                      phoneOtpCode[i]
                        ? 'border-green-500 text-green-700'
                        : 'border-border focus:border-green-400'
                    }`}
                  />
                ))}
              </div>

              {phoneError   && <p className="text-xs text-red-500 text-center">{phoneError}</p>}
              {phoneSuccess && <p className="text-xs text-green-600 text-center flex items-center justify-center gap-1"><Check size={12} /> Numéro mis à jour !</p>}

              <button onClick={handleVerifyPhoneChange} disabled={phoneLoading || phoneOtpCode.length !== 6}
                className="w-full py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-60 transition-all">
                {phoneLoading ? 'Vérification…' : 'Confirmer le code →'}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={sendPhoneChangeOtp}
                  disabled={phoneResendCooldown > 0 || phoneLoading}
                  className="flex-1 text-xs text-text-muted py-2 disabled:opacity-50 transition-opacity">
                  {phoneResendCooldown > 0 ? `Renvoyer dans ${phoneResendCooldown}s` : 'Renvoyer le code'}
                </button>
                <button onClick={() => { setPhoneStep(1); setPhoneOtpCode(''); setPhoneError(''); }}
                  className="flex-1 text-xs text-text-muted py-2 transition-opacity">
                  Changer le numéro
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Adresse de livraison ───────────────────────────────────────────── */}
      <Section title="Adresse de livraison">
        <Row
          icon={MapPin}
          label={profile?.address || 'Aucune adresse'}
          value={profile?.postal_code ? `${profile.postal_code} ${profile.city}` : undefined}
          badge={profile?.address ? <Badge verified={(profile?.address_verified ?? 0) >= 1} /> : undefined}
          onClick={() => { setPanel(p => p === 'address' ? null : 'address'); setAddrError(''); setAddrSuccess(false); }}
        />
      </Section>

      {panel === 'address' && (
        <div className="bg-card-bg rounded-[1.75rem] border border-border-light shadow-sm p-5 space-y-3 -mt-3">
          <div className="relative">
            <MapPin size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input type="text" placeholder="Rechercher une adresse suisse…"
              value={addrQuery} onChange={handleAddrInput}
              onFocus={() => addrSuggestions.length > 0 && setShowAddrSugg(true)}
              onBlur={() => setTimeout(() => setShowAddrSugg(false), 150)}
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border-light border-border-light bg-input-bg text-text-primary text-sm outline-none focus:border-primary" />
            {showAddrSugg && addrSuggestions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card-bg rounded-2xl border border-border-light shadow-xl overflow-hidden">
                {addrSuggestions.map((s, i) => (
                  <button key={i} type="button" onMouseDown={() => selectAddr(s)}
                    className="w-full px-4 py-3 text-left text-sm text-text-primary hover:bg-green-50 dark:hover:bg-white/5 border-b last:border-0 border-border-light transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input type="text" placeholder="NPA" value={addrForm.npa}
              onChange={e => { setAddrForm(f => ({ ...f, npa: e.target.value })); setAddrVerified(false); }}
              className="px-3 py-3 rounded-2xl border border-border-light border-border-light bg-input-bg text-text-primary text-sm outline-none" />
            <input type="text" placeholder="Localité" value={addrForm.city}
              onChange={e => { setAddrForm(f => ({ ...f, city: e.target.value })); setAddrVerified(false); }}
              className="col-span-2 px-3 py-3 rounded-2xl border border-border-light border-border-light bg-input-bg text-text-primary text-sm outline-none" />
          </div>
          {addrVerified && <p className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Adresse vérifiée Swiss Topo</p>}
          {addrError   && <p className="text-xs text-red-500">{addrError}</p>}
          {addrSuccess && <p className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Adresse sauvegardée</p>}
          <div className="flex gap-2">
            <button onClick={saveAddress} disabled={addrSaving}
              className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-60 transition-all">
              {addrSaving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
            <button onClick={() => setPanel(null)}
              className="flex-1 py-3 rounded-2xl bg-app-bg text-text-secondary font-bold text-sm transition-all">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Sécurité ──────────────────────────────────────────────────────── */}
      <Section title="Sécurité">
        <Row icon={Lock} label="Changer le mot de passe"
          onClick={() => { setPanel(p => p === 'password' ? null : 'password'); setPwdError(''); setPwdSuccess(false); setPwdForm({ current: '', next: '', confirm: '' }); }} />
      </Section>

      {panel === 'password' && (
        <div className="bg-card-bg rounded-[1.75rem] border border-border-light shadow-sm p-5 space-y-3 -mt-3">
          {[
            { key: 'current', label: 'Mot de passe actuel' },
            { key: 'next',    label: 'Nouveau mot de passe' },
            { key: 'confirm', label: 'Confirmer le nouveau' },
          ].map(({ key, label }) => (
            <div key={key} className="relative">
              <input
                type={showPwd[key] ? 'text' : 'password'}
                placeholder={label}
                value={pwdForm[key]}
                onChange={e => setPwdForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full pl-4 pr-12 py-3 rounded-2xl border border-border-light border-border-light bg-input-bg text-text-primary text-sm outline-none focus:border-primary"
              />
              <button type="button" onClick={() => setShowPwd(s => ({ ...s, [key]: !s[key] }))}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted">
                {showPwd[key] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          ))}
          {pwdForm.next.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= pwdStrength ? STRENGTH_COLORS[pwdStrength] : 'bg-gray-200 dark:bg-white/10'}`} />
                ))}
              </div>
              <p className="text-[10px] text-text-muted">{STRENGTH_LABELS[pwdStrength]}</p>
            </div>
          )}
          {pwdError   && <p className="text-xs text-red-500">{pwdError}</p>}
          {pwdSuccess && <p className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Mot de passe mis à jour</p>}
          <div className="flex gap-2">
            <button onClick={savePassword} disabled={pwdSaving}
              className="flex-1 py-3 rounded-2xl bg-primary text-white font-bold text-sm disabled:opacity-60 transition-all">
              {pwdSaving ? 'Enregistrement…' : 'Changer'}
            </button>
            <button onClick={() => setPanel(null)}
              className="flex-1 py-3 rounded-2xl bg-app-bg text-text-secondary font-bold text-sm transition-all">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Préférences ───────────────────────────────────────────────────── */}
      <Section title="Préférences">
        <button onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors active:bg-black/5 dark:active:bg-white/5">
          <div className="shrink-0 size-8 rounded-xl bg-primary-light dark:bg-white/10 flex items-center justify-center">
            {darkMode ? <Moon size={15} className="text-primary" /> : <Sun size={15} className="text-primary" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Mode sombre</p>
            <p className="text-xs text-text-muted mt-0.5">{darkMode ? 'Activé' : 'Désactivé'}</p>
          </div>
          <div className={`w-11 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-primary' : 'bg-gray-200 dark:bg-white/20'}`}>
            <div className={`absolute top-1 size-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </button>
      </Section>

      {/* ── Compte ────────────────────────────────────────────────────────── */}
      <Section title="Compte">
        <Row icon={LogOut} label="Se déconnecter" danger onClick={handleLogout} />
      </Section>

      {/* ── Zone danger ───────────────────────────────────────────────────── */}
      <Section title="Zone danger">
        <Row icon={AlertTriangle} label="Supprimer mon compte" value="Action irréversible" danger
          onClick={() => { setPanel(p => p === 'delete' ? null : 'delete'); setDeleteError(''); setDeletePassword(''); setDeleteConfirm(false); }} />
      </Section>

      {panel === 'delete' && (
        <div className="bg-red-50 dark:bg-red-900/10 rounded-[1.75rem] border border-red-200 dark:border-red-800 p-5 space-y-4 -mt-3">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">
              Cette action est <strong>définitive</strong>. Toutes vos données seront supprimées. Entrez votre mot de passe pour confirmer.
            </p>
          </div>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              className="w-full py-3 rounded-2xl border border-red-300 text-red-600 font-bold text-sm transition-all">
              Je comprends, continuer
            </button>
          ) : (
            <>
              <input type="password" placeholder="Votre mot de passe" value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-red-300 dark:border-red-700 bg-input-bg text-text-primary text-sm outline-none focus:border-red-500" />
              {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} disabled={deleteLoading}
                  className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold text-sm disabled:opacity-60 transition-all">
                  {deleteLoading ? 'Suppression…' : 'Supprimer définitivement'}
                </button>
                <button onClick={() => setPanel(null)}
                  className="flex-1 py-3 rounded-2xl bg-app-bg text-text-secondary font-bold text-sm transition-all">
                  Annuler
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </main>
  );
}
