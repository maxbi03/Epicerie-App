// auth.js
// Auth + affichage prénom/nom + logout + helpers UI (modal inscription) + mode visiteur (sessionStorage)
import { supabase } from './supabaseClient.js';
import { getSession, fetchUserProfile, createUserProfile } from './services/userService.js';

const VISITOR_KEY = 'app_mode';
const SKIP_SPLASH_KEY = 'skip_splash_once';
const OPEN_REGISTER_MODAL_KEY = 'open_register_modal';

function isVisitorMode() {
  try {
    return sessionStorage.getItem(VISITOR_KEY) === 'visitor';
  } catch {
    return false;
  }
}

function clearVisitorMode() {
  try {
    sessionStorage.removeItem(VISITOR_KEY);
  } catch {
    // ignore
  }
}

function skipSplashOnce() {
  try {
    sessionStorage.setItem(SKIP_SPLASH_KEY, '1');
  } catch {
    // ignore
  }
}

// ✅ Redirection vers index sans splash, avec option d'ouvrir le modal d'inscription
window.goToLogin = function (mode = 'login') {
  try {
    sessionStorage.setItem(SKIP_SPLASH_KEY, '1');

    if (mode === 'register') {
      sessionStorage.setItem(OPEN_REGISTER_MODAL_KEY, '1');
    } else {
      sessionStorage.removeItem(OPEN_REGISTER_MODAL_KEY);
    }
  } catch (err) {
    console.warn('Impossible de préparer la redirection vers index.html', err);
  }

  window.location.href = 'index.html';
};

// ✅ Ouvrir/fermer le modal d'inscription
window.toggleModal = function (show) {
  const modal = document.getElementById('register-modal');
  if (!modal) return;

  if (show) {
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
};

// ✅ Si on arrive sur index avec "ouvrir inscription", on ouvre automatiquement le modal
document.addEventListener('DOMContentLoaded', async () => {
  const greetingElement = document.getElementById('user-greeting');
  const nameElement = document.getElementById('user-name');

  try {
    const shouldOpenRegisterModal =
      sessionStorage.getItem(OPEN_REGISTER_MODAL_KEY) === '1';

    if (shouldOpenRegisterModal) {
      sessionStorage.removeItem(OPEN_REGISTER_MODAL_KEY);

      // petit délai pour laisser le DOM se stabiliser
      setTimeout(() => {
        if (typeof window.toggleModal === 'function') {
          window.toggleModal(true);
        }
      }, 50);
    }
  } catch (err) {
    console.warn("Impossible d'ouvrir automatiquement le modal d'inscription", err);
  }

  if (isVisitorMode()) {
    if (greetingElement) greetingElement.textContent = "Visiteur";
    if (nameElement) nameElement.textContent = "Visiteur";
    return;
  }

  try {
    const session = await getSession();

    if (!session) {
      if (greetingElement) greetingElement.textContent = "Visiteur";
      if (nameElement) nameElement.textContent = "Visiteur";
      return;
    }

    const profile = await fetchUserProfile(session.user.id);
    if (!profile) return;

    if (greetingElement) {
      const firstName = (profile.name || "").split(" ")[0] || "Utilisateur";
      greetingElement.textContent = firstName;
    }

    if (nameElement) {
      nameElement.textContent = profile.name || "Utilisateur";
    }
  } catch (err) {
    console.error("Erreur session/profil:", err?.message || err);

    if (greetingElement) greetingElement.textContent = "Visiteur";
    if (nameElement) nameElement.textContent = "Visiteur";
  }
});

// Register (email/password pour l’instant; OTP SMS ensuite)
window.handleRegister = async function () {
  const firstname = document.getElementById('reg-firstname')?.value?.trim();
  const lastname = document.getElementById('reg-lastname')?.value?.trim();

  const emailRaw = document.getElementById('reg-email')?.value ?? '';
  const email = emailRaw.trim().toLowerCase();

  const address = document.getElementById('reg-address')?.value?.trim();
  const npa = document.getElementById('reg-npa')?.value?.trim();
  const city = document.getElementById('reg-city')?.value?.trim();
  const phone = document.getElementById('reg-phone')?.value?.trim();
  const password = document.getElementById('reg-password')?.value?.trim();
  const passwordConfirm = document.getElementById('reg-password-confirm')?.value?.trim();

  if (!firstname || !lastname || !email || !address || !npa || !city || !phone || !password || !passwordConfirm) {
    alert("Veuillez remplir tous les champs.");
    return;
  }

  if (!email.includes('@')) {
    alert("Adresse email invalide.");
    return;
  }

  if (password !== passwordConfirm) {
    alert("Les mots de passe ne correspondent pas !");
    return;
  }

  const fullName = `${firstname} ${lastname}`;
  const fullAddress = `${address}, ${npa} ${city}`;

  console.log("➡️ Signup attempt with email:", email);

  const { data, error } = await supabase.auth.signUp({ email, password });

  console.log("⬅️ Signup response:", { data, error });

  if (error) {
    const msg = (error.message || "").toLowerCase();

    if (msg.includes("already registered")) {
      alert("Un compte existe déjà avec cette adresse email. Essaie de te connecter.");
    } else {
      alert(error.message);
    }
    return;
  }

  const userId = data.user?.id;
  if (!userId) {
    alert("Erreur: userId introuvable.");
    return;
  }

  try {
    await createUserProfile({
      id: userId,
      name: fullName,
      email,
      address: fullAddress,
      phone
    });
  } catch (err) {
    alert("Erreur création profil : " + (err?.message || err));
    return;
  }

  clearVisitorMode();
  window.toggleModal(false);
  window.location.href = "home.html";
};

// Login
window.handleLogin = async function () {
  const emailRaw = document.getElementById('login-email')?.value ?? '';
  const email = emailRaw.trim().toLowerCase();
  const password = document.getElementById('login-password')?.value?.trim();

  if (!email || !password) {
    alert("Veuillez entrer email et mot de passe");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Identifiants incorrects");
    return;
  }

  clearVisitorMode();
  window.location.href = "home.html";
};

// Logout
window.logout = async function () {
  clearVisitorMode();
  skipSplashOnce();
  await supabase.auth.signOut();
  window.location.href = "index.html";
};