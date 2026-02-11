// --- 1. LE DÉTECTEUR (S'exécute au chargement de chaque page) ---
document.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('user_session');

    if (session) {
        const user = JSON.parse(session);

        // On cherche les endroits où afficher le nom/prénom
        const greetingElement = document.getElementById('user-greeting');
        const nameElement = document.getElementById('user-name');

        if (greetingElement) {
            // Affiche le premier mot du nom (le prénom)
            const firstName = user.name.split(' ')[0];
            greetingElement.textContent = firstName;
        }

        if (nameElement) {
            nameElement.textContent = user.name;
        }
    }
});

// --- 2. FONCTION DE CONNEXION (Page index.html) ---
function handleLogin() {
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;

    if (!phone || !password) {
        alert("Merci de remplir tous les champs !");
        return;
    }

    // Simulation : on crée une session avec le nom "Maxime" par défaut
    const userData = {
        name: "Maxime", 
        phone: phone,
        points: 150
    };

    localStorage.setItem('user_session', JSON.stringify(userData));
    window.location.href = "home.html"; 
}

// --- 3. FONCTION D'INSCRIPTION (Page inscription.html) ---
function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;

    if (!name || !phone || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    const newUser = {
        name: name,
        phone: phone,
        password: password, 
        points: 0,
        level: "Nouveau Membre"
    };

    localStorage.setItem('user_session', JSON.stringify(newUser));
    
    alert("Compte créé avec succès ! Bienvenue " + name);
    window.location.href = "home.html";
}

// --- 4. FONCTION DE DÉCONNEXION ---
function logout() {
    localStorage.removeItem('user_session');
    window.location.href = "index.html";
}