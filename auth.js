// ======================
// SUPABASE CLIENT (centralisé)
// ======================
import { supabase } from './supabaseClient.js';


// ======================
// DETECTEUR SESSION
// ======================
document.addEventListener('DOMContentLoaded', async () => {

    const { data: { session } } = await supabase.auth.getSession();

    const greetingElement = document.getElementById('user-greeting');
    const nameElement = document.getElementById('user-name');

    if (!session) {
        if (greetingElement) greetingElement.textContent = "Visiteur";
        if (nameElement) nameElement.textContent = "Invité";
        return;
    }

    // récupérer profil DB
    const { data } = await supabase
        .from('users')
        .select()
        .eq('id', session.user.id)
        .single();

    if (!data) return;

    if (greetingElement) {
        const firstName = data.name.split(' ')[0];
        greetingElement.textContent = firstName;
    }

    if (nameElement) {
        nameElement.textContent = data.name;
    }
});


// ======================
// MODAL REGISTER
// ======================
window.toggleModal = function(show) {
    const modal = document.getElementById('register-modal');
    if (!modal) return;
    modal.classList.toggle('hidden', !show);
}


// ======================
// REGISTER
// ======================
window.handleRegister = async function() {

    const firstname = document.getElementById('reg-firstname').value.trim();
    const lastname = document.getElementById('reg-lastname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const address = document.getElementById('reg-address').value.trim();
    const npa = document.getElementById('reg-npa').value.trim();
    const city = document.getElementById('reg-city').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const password = document.getElementById('reg-password').value.trim();
    const passwordConfirm = document.getElementById('reg-password-confirm').value.trim();

    // Vérification que tous les champs sont remplis
    if (!firstname || !lastname || !email || !address || !npa || !city || !phone || !password || !passwordConfirm) {
        console.error("Veuillez remplir tous les champs.");
        return;
    }

    // Vérification que les mots de passe correspondent
    if (password !== passwordConfirm) {
        console.error("Les mots de passe ne correspondent pas !");
        return;
    }

    const fullName = `${firstname} ${lastname}`;
    const fullAddress = `${address}, ${npa} ${city}`;

    // ---------- SIGNUP AUTH ----------
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        console.error(error.message);
        return;
    }

    const userId = data.user.id;

    // ---------- INSERT PROFIL ----------
    const { error: insertError } = await supabase
        .from('users')
        .insert({
            id: userId,
            name: fullName,
            email,
            address: fullAddress,
            phone
        });

    if (insertError) {
        console.error(insertError.message);
        return;
    }

    // FERMER MODAL et REDIRECTION sans message alert
    toggleModal(false);
    window.location.href = "home.html";
};


// ======================
// LOGIN EMAIL + PASSWORD
// ======================
window.handleLogin = async function() {

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        alert("Veuillez entrer email et mot de passe");
        return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert("Identifiants incorrects");
        console.error(error.message);
        return;
    }

    // login OK → redirection
    window.location.href = "home.html";
};


// ======================
// LOGOUT
// ======================
window.logout = async function() {
    await supabase.auth.signOut();
    window.location.href = "index.html";
};