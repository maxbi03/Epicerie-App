// auth.js
// Gestion auth + affichage nom/prénom
// Utilise supabaseClient.js + services/userService.js

import { supabase } from './supabaseClient.js';
import {
  getSession,
  fetchUserProfile,
  createUserProfile
} from './services/userService.js';


// ======================
// DETECTEUR SESSION (affiche prénom/nom si présent dans la page)
// ======================
document.addEventListener('DOMContentLoaded', async () => {
  const greetingElement = document.getElementById('user-greeting');
  const nameElement = document.getElementById('user-name');

  try {
    const session = await getSession();

    if (!session) {
      if (greetingElement) greetingElement.textContent = "Visiteur";
      if (nameElement) nameElement.textContent = "Invité";
      return;
    }

    const profile = await fetchUserProfile(session.user.id);
    if (!profile) return;

    if (greetingElement) {
      const firstName = (profile.name || '').split(' ')[0] || "Utilisateur";
      greetingElement.textContent = firstName;
    }

    if (nameElement) {
      nameElement.textContent = profile.name || "Utilisateur";
    }

  } catch (err) {
    console.error("Erreur session/profil:", err?.message || err);
    if (greetingElement) greetingElement.textContent = "Visiteur";
    if (nameElement) nameElement.textContent = "Invité";
  }
});


// ======================
// MODAL REGISTER
// ======================
window.toggleModal = function (show) {
  const modal = document.getElementById('register-modal');
  if (!modal) return;
  modal.classList.toggle('hidden', !show);
};


// ======================
// REGISTER
// ======================
window.handleRegister = async function () {
  const firstname = document.getElementById('reg-firstname').value.trim();
  const lastname = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const address = document.getElementById('reg-address').value.trim();
  const npa = document.getElementById('reg-npa').value.trim();
  const city = document.getElementById('reg-city').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const passwordConfirm = document.getElementById('reg-password-confirm').value.trim();

  if (!firstname || !lastname || !email || !address || !npa || !city || !phone || !password || !passwordConfirm) {
    console.error("Veuillez remplir tous les champs.");
    return;
  }

  if (password !== passwordConfirm) {
    console.error("Les mots de passe ne correspondent pas !");
    return;
  }

  const fullName = `${firstname} ${lastname}`;
  const fullAddress = `${address}, ${npa} ${city}`;

  // ---------- SIGNUP AUTH ----------
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error(error.message);
    return;
  }

  const userId = data.user?.id;
  if (!userId) {
    console.error("Signup OK mais userId introuvable.");
    return;
  }

  // ---------- INSERT PROFIL (centralisé) ----------
  try {
    await createUserProfile({
      id: userId,
      name: fullName,
      email,
      address: fullAddress,
      phone
    });
  } catch (err) {
    console.error("Erreur création profil:", err?.message || err);
    return;
  }

  toggleModal(false);
  window.location.href = "home.html";
};


// ======================
// LOGIN EMAIL + PASSWORD
// ======================
window.handleLogin = async function () {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    alert("Veuillez entrer email et mot de passe");
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Identifiants incorrects");
    console.error(error.message);
    return;
  }

  window.location.href = "home.html";
};


// ======================
// LOGOUT
// ======================
window.logout = async function () {
  await supabase.auth.signOut();
  window.location.href = "index.html";
};