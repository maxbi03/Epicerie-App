// Importation de la bibliothèque Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialisation de Supabase
const supabaseUrl = 'https://jykfgstmcmhhhluzojxb.supabase.co';
const supabaseKey = 'sb_publishable_aE4PA7Vz2K3R4Btw-mAm8g_M_7ONE7_';
const supabase = createClient(supabaseUrl, supabaseKey);

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
async function handleRegister() {
    // Récupérer les valeurs des champs du formulaire
    const firstname = document.getElementById('reg-firstname').value;
    const lastname = document.getElementById('reg-lastname').value;
    const name = `${firstname} ${lastname}`;
    const email = document.getElementById('reg-email').value;
    const address = document.getElementById('reg-address').value;
    const npa = document.getElementById('reg-npa').value;
    const city = document.getElementById('reg-city').value;
    const fullAddress = `${address}, ${npa} ${city}`;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;

    // Vérifier que tous les champs sont remplis
    if (!firstname || !lastname || !email || !address || !npa || !city || !phone || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    try {
        // 1. Inscription via Supabase Auth
        const { user, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Erreur lors de l'inscription :", error.message);
            alert("Erreur lors de l'inscription : " + error.message);
            return;
        }

        // 2. Insérer les données supplémentaires dans la table "users"
        if (user) {
            const { error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        id: user.id, // ID généré par Supabase Auth
                        name: name,
                        email: email,
                        address: fullAddress,
                        phone: phone,
                    }
                ]);

            if (insertError) {
                console.error("Erreur lors de l'insertion des données utilisateur :", insertError.message);
                alert("Erreur lors de l'insertion des données utilisateur : " + insertError.message);
                return;
            }
        }

        // 3. Stocker la session utilisateur
        const userSession = {
            id: user.id,
            name: name,
            email: email,
            address: fullAddress,
            phone: phone,
        };
        localStorage.setItem('user_session', JSON.stringify(userSession));

        // 4. Rediriger vers la page d'accueil
        alert("Inscription réussie ! Vous allez être redirigé.");
        window.location.href = "home.html";

    } catch (error) {
        console.error("Erreur inattendue :", error);
        alert("Erreur inattendue : " + error.message);
    }
}

// --- 4. FONCTION DE CONNEXION MODIFIÉE ---
async function handleLogin() {
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;

    if (!phone || !password) {
        alert("Veuillez remplir tous les champs.");
        return;
    }

    try {
        // 1. Connexion via Supabase Auth
        const { user, error } = await supabase.auth.signIn({
            email: phone + "@epicerie.com", // Utilise le téléphone comme email (à adapter selon ta logique)
            password: password,
        });

        if (error) {
            console.error("Erreur lors de la connexion :", error.message);
            alert("Erreur lors de la connexion : " + error.message);
            return;
        }

        // 2. Récupérer les données utilisateur depuis la table "users"
        const { data, error: fetchError } = await supabase
            .from('users')
            .select()
            .eq('id', user.id)
            .single();

        if (fetchError) {
            console.error("Erreur lors de la récupération des données utilisateur :", fetchError.message);
            alert("Erreur lors de la récupération des données utilisateur : " + fetchError.message);
            return;
        }

        // 3. Stocker la session utilisateur
        const userSession = {
            id: user.id,
            name: data.name,
            email: data.email,
            address: data.address,
            phone: data.phone,
        };
        localStorage.setItem('user_session', JSON.stringify(userSession));

        // 4. Rediriger vers la page d'accueil
        alert("Connexion réussie ! Vous allez être redirigé.");
        window.location.href = "home.html";

    } catch (error) {
        console.error("Erreur inattendue :", error);
        alert("Erreur inattendue : " + error.message);
    }
}

// --- 5. FONCTION DE DÉCONNEXION ---
function logout() {
    localStorage.removeItem('user_session');
    // On ne fait pas localStorage.clear() pour garder le compte enregistré sur l'ordi !
    window.location.href = "index.html";
}
