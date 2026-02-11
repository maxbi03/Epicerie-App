// --- 1. LE DÉTECTEUR (S'exécute au chargement de chaque page) ---
document.addEventListener('DOMContentLoaded', () => {
    // On vérifie s'il y a une session active
    const session = localStorage.getItem('user_session');
    
    // On cherche l'endroit où afficher le nom (dans home.html)
    const greetingElement = document.getElementById('user-greeting');
    const nameElement = document.getElementById('user-name'); // Pour profil.html

    if (session) {
        const user = JSON.parse(session);
        
        // Si on est connecté, on affiche le prénom
        if (greetingElement) {
            // On récupère le prénom (premier mot du nom complet)
            const firstName = user.name.split(' ')[0];
            greetingElement.textContent = firstName;
        }

        // Sur la page profil, on affiche le nom complet
        if (nameElement) {
            nameElement.textContent = user.name;
        }
    } else {
        // SI PAS DE SESSION (Mode Visiteur)
        if (greetingElement) {
            greetingElement.textContent = "Visiteur";
        }
        if (nameElement) {
            nameElement.textContent = "Invité";
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

// --- 3. FONCTION D'INSCRIPTION MODIFIÉE ---
function handleRegister() {
    // ... tes variables (firstName, lastName, etc.) restent les mêmes ...
    const firstName = document.getElementById('reg-firstname').value;
    const lastName = document.getElementById('reg-lastname').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    // ... (récupère tous les autres champs comme avant)

    if (!firstName || !phone || !password) {
        alert("Le prénom, le téléphone et le code sont obligatoires !");
        return;
    }

    const newUser = {
        name: `${firstName} ${lastName}`,
        phone: phone,
        password: password,
        points: 0,
        level: "Nouveau Membre"
        // ... ajoute les autres champs (email, adresse) ici
    };

    localStorage.setItem('registered_user', JSON.stringify(newUser));
    
    // --- ON ENLÈVE L'ALERT ET ON FERME JUSTE LA MODALE ---
    toggleModal(false); 
    
    // Optionnel : on peut vider les champs de la modale pour la prochaine fois
    document.querySelectorAll('#register-modal input').forEach(input => input.value = '');

    document.getElementById('login-phone').value = phone;
    document.getElementById('login-password').focus(); // Place le curseur directement sur le code secret
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