// ======================
// SUPABASE INIT
// ======================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://jykfgstmcmhhhluzojxb.supabase.co';
const supabaseKey = 'sb_publishable_aE4PA7Vz2K3R4Btw-mAm8g_M_7ONE7_';

const supabase = createClient(supabaseUrl, supabaseKey);


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

    if (!firstname || !lastname || !email || !address || !npa || !city || !phone || !password) {
        alert("Veuillez remplir tous les champs.");
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
        alert(error.message);
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
        alert(insertError.message);
        return;
    }

    alert("Inscription réussie !");
    window.location.href = "home.html";
};


// ======================
// LOGIN
// ======================
window.handleLogin = async function() {

    const phone = document.getElementById('login-phone').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!phone || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    // chercher email via téléphone
    const { data: profile, error } = await supabase
        .from('users')
        .select('email')
        .eq('phone', phone)
        .single();

    if (error || !profile) {
        alert("Téléphone inconnu");
        return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password
    });

    if (loginError) {
        alert(loginError.message);
        return;
    }

    alert("Connexion réussie !");
    window.location.href = "home.html";
};


// ======================
// LOGOUT
// ======================
window.logout = async function() {
    await supabase.auth.signOut();
    window.location.href = "index.html";
};