import { supabase } from './supabaseClient.js';
import { getSession, fetchUserProfile, createUserProfile } from './services/userService.js';
import { initializeAddressAutocomplete } from './services/addressService.js';

// ─────────────────────────────────────────
// CONSTANTES SESSION
// ─────────────────────────────────────────
const VISITOR_KEY       = 'app_mode';
const SKIP_SPLASH_KEY   = 'skip_splash_once';
const OPEN_REGISTER_KEY = 'open_register_modal';

function isVisitorMode() {
  try { return sessionStorage.getItem(VISITOR_KEY) === 'visitor'; } catch { return false; }
}
function clearVisitorMode() {
  try { sessionStorage.removeItem(VISITOR_KEY); } catch {}
}
function skipSplashOnce() {
  try { sessionStorage.setItem(SKIP_SPLASH_KEY, '1'); } catch {}
}

// ─────────────────────────────────────────
// NAVIGATION GLOBALE
// ─────────────────────────────────────────
window.goToLogin = function (mode = 'login') {
  try {
    sessionStorage.setItem(SKIP_SPLASH_KEY, '1');
    if (mode === 'register') sessionStorage.setItem(OPEN_REGISTER_KEY, '1');
    else sessionStorage.removeItem(OPEN_REGISTER_KEY);
  } catch {}
  window.location.href = 'index.html';
};

window.logout = async function () {
  clearVisitorMode();
  skipSplashOnce();
  await supabase.auth.signOut();
  window.location.href = 'index.html';
};

// ─────────────────────────────────────────
// MODAL TOGGLE
// ─────────────────────────────────────────
window.toggleModal = function (show) {
  const modal = document.getElementById('register-modal');
  if (!modal) return;
  if (show) {
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    resetRegistrationFlow();
  } else {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }
};

// ─────────────────────────────────────────
// ÉTAPES
// ─────────────────────────────────────────
const STEP_TITLES = { 1: 'Créer un compte', 2: 'Vérification SMS', 3: 'Compte activé' };

function showStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`reg-step-${i}`)?.classList.toggle('hidden', i !== n);
  });
  const titleEl = document.getElementById('modal-step-title');
  if (titleEl) titleEl.textContent = STEP_TITLES[n] || '';

  [1, 2, 3].forEach(i => {
    const dot = document.getElementById(`step-dot-${i}`);
    if (!dot) return;
    if (i < n) {
      dot.className = 'size-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black transition-all';
      dot.innerHTML = '<span class="material-symbols-outlined text-sm">check</span>';
    } else if (i === n) {
      dot.className = 'size-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-black transition-all';
      dot.textContent = i;
    } else {
      dot.className = 'size-8 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-400 text-xs font-black transition-all';
      dot.textContent = i;
    }
  });
  [1, 2].forEach(i => {
    const bar = document.getElementById(`step-bar-${i}`);
    if (!bar) return;
    bar.className = i < n
      ? 'flex-1 h-1 rounded-full bg-primary transition-all'
      : 'flex-1 h-1 rounded-full bg-gray-200 dark:bg-white/10 transition-all';
  });
}

function resetRegistrationFlow() {
  showStep(1);
  document.querySelectorAll('.otp-input').forEach(i => i.value = '');
  const errEl = document.getElementById('otp-error');
  if (errEl) errEl.classList.add('hidden');
}

// ─────────────────────────────────────────
// FORCE MOT DE PASSE
// ─────────────────────────────────────────
const STRENGTH_COLORS = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-primary'];
const STRENGTH_LABELS = ['', 'Trop faible', 'Faible', 'Moyen', 'Fort ✓'];

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return score;
}

function updateStrengthUI(pwd) {
  const score = getPasswordStrength(pwd);
  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(`strength-bar-${i}`);
    if (!bar) continue;
    bar.className = `h-1 flex-1 rounded-full transition-all ${i <= score ? STRENGTH_COLORS[score] : 'bg-gray-200 dark:bg-white/10'}`;
  }
  const label = document.getElementById('strength-label');
  if (label) label.textContent = pwd.length > 0 ? STRENGTH_LABELS[score] : '';
}

window.togglePasswordVisibility = function (inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? 'visibility_off' : 'visibility';
};

// ─────────────────────────────────────────
// ÉTAPE 1 → Envoyer OTP
// ─────────────────────────────────────────
window.goToStep2 = async function () {
  const firstname       = document.getElementById('reg-firstname')?.value.trim();
  const lastname        = document.getElementById('reg-lastname')?.value.trim();
  const emailRaw        = document.getElementById('reg-email')?.value ?? '';
  const email           = emailRaw.trim().toLowerCase();
  const addressVerified = document.getElementById('reg-address-verified')?.value === 'true';
  const addressLabel    = document.getElementById('reg-address')?.value.trim();
  const city            = document.getElementById('reg-city')?.value.trim();
  const password        = document.getElementById('reg-password')?.value ?? '';
  const passwordConfirm = document.getElementById('reg-password-confirm')?.value ?? '';
  const phone           = document.getElementById('reg-phone')?.value.trim();

  if (!firstname || !lastname)              { alert('Prénom et nom obligatoires.'); return; }
  if (!addressVerified || !addressLabel || !city) {
    alert('Sélectionnez une adresse suisse valide dans les suggestions.'); return;
  }
  if (!email || !email.includes('@'))       { alert('Adresse email invalide.'); return; }
  if (password.length < 10)                 { alert('Le code secret doit contenir au moins 10 caractères.'); return; }
  if (getPasswordStrength(password) < 2)   { alert('Code trop faible. Ajoutez des chiffres ou des majuscules.'); return; }
  if (password !== passwordConfirm)         { alert('Les codes secrets ne correspondent pas.'); return; }
  if (!phone || !phone.startsWith('+'))     { alert('Format requis : +41 79 123 45 67'); return; }

  const btn = document.querySelector('#reg-step-1 button[onclick="goToStep2()"]');
  if (btn) { btn.disabled = true; btn.textContent = 'Envoi du SMS…'; }

  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;

    const display = document.getElementById('otp-phone-display');
    if (display) {
      const masked = phone.slice(0, -4).replace(/\d/g, '•') + phone.slice(-4);
      display.textContent = masked;
    }
    showStep(2);
    startResendCountdown();
    initOtpInputs();
  } catch (err) {
    alert('Erreur envoi SMS : ' + (err?.message || err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Continuer <span class="material-symbols-outlined text-sm">arrow_forward</span>';
    }
  }
};

window.backToStep1 = function () { showStep(1); };

// ─────────────────────────────────────────
// COMPTEUR RENVOI SMS
// ─────────────────────────────────────────
let resendTimer = null;

function startResendCountdown(seconds = 30) {
  const btn       = document.getElementById('resend-btn');
  const countdown = document.getElementById('resend-countdown');
  if (!btn || !countdown) return;

  btn.disabled = true;
  btn.className = 'text-sm font-bold text-gray-300 dark:text-gray-600 transition-colors';
  let remaining = seconds;
  countdown.textContent = remaining;

  if (resendTimer) clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    remaining--;
    countdown.textContent = remaining;
    if (remaining <= 0) {
      clearInterval(resendTimer);
      btn.disabled = false;
      btn.className = 'text-sm font-bold text-primary transition-colors';
      btn.textContent = 'Renvoyer le code';
    }
  }, 1000);
}

window.resendOtp = async function () {
  const phone = document.getElementById('reg-phone')?.value.trim();
  if (!phone) return;
  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
    startResendCountdown(30);
    document.querySelectorAll('.otp-input').forEach(i => i.value = '');
    document.querySelectorAll('.otp-input')[0]?.focus();
  } catch (err) {
    alert('Erreur renvoi SMS : ' + (err?.message || err));
  }
};

// ─────────────────────────────────────────
// NAVIGATION CASES OTP
// ─────────────────────────────────────────
function initOtpInputs() {
  let inputs = [...document.querySelectorAll('.otp-input')];
  inputs = inputs.map(input => {
    const fresh = input.cloneNode(true);
    input.parentNode.replaceChild(fresh, input);
    return fresh;
  });
  inputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && idx < inputs.length - 1) inputs[idx + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) inputs[idx - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      inputs.forEach((inp, i) => { inp.value = text[i] || ''; });
      inputs[Math.min(text.length, inputs.length) - 1]?.focus();
    });
  });
  inputs[0]?.focus();
}

// ─────────────────────────────────────────
// ÉTAPE 2 → Vérifier OTP + créer compte
// ─────────────────────────────────────────
window.verifyOtpAndRegister = async function () {
  const otpInputs = [...document.querySelectorAll('.otp-input')];
  const token     = otpInputs.map(i => i.value).join('');
  const errEl     = document.getElementById('otp-error');

  if (token.length !== 6) {
    if (errEl) { errEl.textContent = 'Entrez les 6 chiffres du code.'; errEl.classList.remove('hidden'); }
    return;
  }

  const phone        = document.getElementById('reg-phone')?.value.trim();
  const email        = document.getElementById('reg-email')?.value.trim().toLowerCase();
  const password     = document.getElementById('reg-password')?.value ?? '';
  const firstname    = document.getElementById('reg-firstname')?.value.trim();
  const lastname     = document.getElementById('reg-lastname')?.value.trim();
  const fullName     = `${firstname} ${lastname}`.trim();
  const street       = document.getElementById('reg-street')?.value.trim();
  const houseNumber  = document.getElementById('reg-house-number')?.value.trim();
  const postalCode   = document.getElementById('reg-npa')?.value.trim();
  const city         = document.getElementById('reg-city')?.value.trim();
  const country      = document.getElementById('reg-country')?.value.trim() || 'CH';
  const addressLabel = document.getElementById('reg-address')?.value.trim();

  const btn = document.getElementById('verify-otp-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Vérification…'; }
  if (errEl) errEl.classList.add('hidden');

  try {
    // 1) Vérifier OTP téléphone
    const { error: otpError } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    if (otpError) throw otpError;

    // 2) Créer compte email + mot de passe
    // "Confirm email" est désactivé dans Supabase → pas de blocage RLS
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      const msg = (signUpError.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        throw new Error('Un compte existe déjà avec cet email. Essayez de vous connecter.');
      }
      throw signUpError;
    }

    const userId = data?.user?.id;
    if (!userId) throw new Error('Identifiant utilisateur introuvable après inscription.');

    // 3) Créer le profil
    await createUserProfile({
      id: userId,
      name: fullName,
      email,
      phone,
      address: addressLabel,
      street,
      house_number: houseNumber,
      postal_code: postalCode,
      city,
      country,
      address_label: addressLabel,
      address_verified: true,
      phone_verified: true,
    });

    // 4) Succès → étape 3 + redirection
    clearVisitorMode();
    showStep(3);
    setTimeout(() => {
      window.toggleModal(false);
      window.location.href = 'home.html';
    }, 2500);

  } catch (err) {
    if (errEl) {
      errEl.textContent = err?.message || 'Code incorrect ou expiré. Réessayez.';
      errEl.classList.remove('hidden');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Vérifier le code'; }
  }
};

// ─────────────────────────────────────────
// CONNEXION (email + mot de passe)
// ─────────────────────────────────────────
window.handleLogin = async function () {
  const email    = (document.getElementById('login-email')?.value ?? '').trim().toLowerCase();
  const password = document.getElementById('login-password')?.value ?? '';

  if (!email || !password) { alert('Veuillez entrer email et mot de passe.'); return; }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { alert('Identifiants incorrects.'); return; }

  clearVisitorMode();
  window.location.href = 'home.html';
};

// ─────────────────────────────────────────
// INIT PAGE
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  try { initializeAddressAutocomplete(); } catch (err) { console.error('Autocomplete:', err); }

  document.getElementById('reg-password')?.addEventListener('input', (e) => {
    updateStrengthUI(e.target.value);
  });

  try {
    if (sessionStorage.getItem(OPEN_REGISTER_KEY) === '1') {
      sessionStorage.removeItem(OPEN_REGISTER_KEY);
      setTimeout(() => window.toggleModal?.(true), 50);
    }
  } catch {}

  const greetingEl = document.getElementById('user-greeting');
  const nameEl     = document.getElementById('user-name');

  if (isVisitorMode()) {
    if (greetingEl) greetingEl.textContent = 'Visiteur';
    if (nameEl)     nameEl.textContent     = 'Visiteur';
    return;
  }

  try {
    const session = await getSession();
    if (!session) {
      if (greetingEl) greetingEl.textContent = 'Visiteur';
      if (nameEl)     nameEl.textContent     = 'Visiteur';
      return;
    }
    const profile = await fetchUserProfile(session.user.id);
    if (!profile) return;
    if (greetingEl) greetingEl.textContent = (profile.name || '').split(' ')[0] || 'Utilisateur';
    if (nameEl)     nameEl.textContent     = profile.name || 'Utilisateur';
  } catch (err) {
    console.error('Session/profil:', err?.message || err);
    if (greetingEl) greetingEl.textContent = 'Visiteur';
    if (nameEl)     nameEl.textContent     = 'Visiteur';
  }
});