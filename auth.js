// auth.js
// Auth + affichage prénom/nom + logout + mode visiteur (sessionStorage)
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

// Expose helpers (utile pour les prochaines étapes: scanner/porte)
window.isVisitorMode = isVisitorMode;
window.clearVisitorMode = clearVisitorMode;

// Affiche prénom/nom si les éléments existent sur la page
document.addEventListener('DOMContentLoaded', async () => {
  const greetingElement = document.getElementById('user-greeting');
  const nameElement = document.getElementById('user-name');

  // ✅ PRIORITÉ: mode visiteur (pas de session Supabase)
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

// Register
window.handleRegister = async function () {
  const firstname = document.getElementById('reg-firstname')?.value?.trim();
  const lastname = document.getElementById('reg-lastname')?.value?.trim();
  const email = document.getElementById('reg-email')?.value?.trim();
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

  if (password !== passwordConfirm) {
    alert("Les mots de passe ne correspondent pas !");
    return;
  }

  const fullName = `${firstname} ${lastname}`;
  const fullAddress = `${address}, ${npa} ${city}`;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    alert(error.message);
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

  // ✅ si on s'inscrit, on quitte le mode visiteur
  clearVisitorMode();

  window.location.href = "home.html";
};

// Login
window.handleLogin = async function () {
  const email = document.getElementById('login-email')?.value?.trim();
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

  // ✅ si on se connecte, on quitte le mode visiteur
  clearVisitorMode();

  window.location.href = "home.html";
};

// Logout
window.logout = async function () {
  clearVisitorMode();
  await supabase.auth.signOut();
  window.location.href = "index.html";
};