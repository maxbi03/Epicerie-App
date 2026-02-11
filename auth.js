// --- 1. LE DÉTECTEUR (S'exécute au chargement de chaque page) ---
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');

    if (session) {
        const user = JSON.parse(session);
        const greetingElement = document.getElementById('user-greeting');
        const nameElement = document.getElementById('user-name');

        if (greetingElement) {
            // Affiche le premier mot du prénom
            const firstName = user.name.split(' ')[0];
            greetingElement.textContent = firstName;
        }
        if (nameElement) {
            nameElement.textContent = user.name;
        }
    }
});

// --- 2. GESTION DE LA FENÊTRE D'INSCRIPTION (MODALE) ---
function toggleModal(show) {
    const modal = document.getElementById('register-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

// --- 3. FONCTION D'INSCRIPTION ---
function handleRegister() {
    // On récupère toutes les infos pro
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const email = document.getElementById('reg-email').value;
    const address = document.getElementById('reg-address').value;
    const npa = document.getElementById('reg-npa').value;
    const city = document.getElementById('reg-city').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;

    // Validation de base
    if (!firstName || !lastName || !phone || !password) {
        alert("Attention : Le nom, le prénom, le téléphone et le code sont obligatoires !");
        return;
    }

    const newUser = {
        name: `${firstName} ${lastName}`,
        email: email,
        address: `${address}, ${npa} ${city}`,
        phone: phone,
        password: password,
        points: 0,
        level: "Nouveau Membre"
    };

    // On stocke le compte de façon permanente sur l'ordi
    localStorage.setItem('registered_user', JSON.stringify(newUser));
    
    alert("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
    toggleModal(false); // On ferme la fenêtre
}

// --- 4. FONCTION DE CONNEXION ---
function handleLogin() {
    const inputPhone = document.getElementById('login-phone').value;
    const inputPass = document.getElementById('login-password').value;

    // On va chercher le compte qu'on a créé à l'inscription
    const savedUser = JSON.parse(localStorage.getItem('registered_user'));

    if (savedUser && inputPhone === savedUser.phone && inputPass === savedUser.password) {
        // Si ça match, on crée la session active
        localStorage.setItem('user_session', JSON.stringify(savedUser));
        window.location.href = "home.html";
    } else {
        alert("Identifiants incorrects. Avez-vous créé un compte ?");
    }
}

// --- 5. FONCTION DE DÉCONNEXION ---
function logout() {
    localStorage.removeItem('user_session');
    // On ne fait pas localStorage.clear() pour garder le compte enregistré sur l'ordi !
    window.location.href = "index.html";
}