// auth.js
// Auth + affichage prénom/nom + logout + helpers UI (modal inscription) + mode visiteur (sessionStorage)
import { supabase } from './supabaseClient.js';
import { getSession, fetchUserProfile, createUserProfile } from './services/userService.js';

const VISITOR_KEY = 'app_mode';

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

// ✅ Ouvrir/fermer le modal d'inscription
window.toggleModal = function (show) {
  const modal = document.getElementById('register-modal');
  if (!modal) return;
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
};

// Affiche prénom/nom si les éléments existent sur la page
document.addEventListener('DOMContentLoaded', async () => {
  const greetingElement = document.getElementById('user-greeting');
  const nameElement = document.getElementById('user-name');

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

  // ✅ email normalisé
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

  // 🔎 Diagnostic (console)
  console.log("➡️ Signup attempt with email:", email);

  const { data, error } = await supabase.auth.signUp({ email, password });

  // 🔎 Diagnostic (console)
  console.log("⬅️ Signup response:", { data, error });

  if (error) {
    const msg = (error.message || "").toLowerCase();

    // Message plus clair côté utilisateur
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
    await createUserProfile({ id: userId, name: fullName, email, address: fullAddress, phone });
  } catch (err) {
    alert("Erreur création profil : " + (err?.message || err));
    return;
  }

  clearVisitorMode();
  window.toggleModal(false);

  // (on remplacera par l'écran OTP ensuite)
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
  await supabase.auth.signOut();
  window.location.href = "index.html";
};