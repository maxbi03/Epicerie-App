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
async function handleRegister(name, email, address, phone, password) {
    try {
        // 1. Inscription via Supabase Auth (le mot de passe est haché et stocké automatiquement)
        const { user, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Erreur lors de l'inscription :", error.message);
            return { success: false, error: error.message };
        }

        // 2. Insérer les données supplémentaires dans ta table "users"
        if (user) {
            const { error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        id: user.id, // ID généré par Supabase Auth
                        name: name,
                        email: email,
                        address: address,
                        phone: phone,
                    }
                ]);

            if (insertError) {
                console.error("Erreur lors de l'insertion des données utilisateur :", insertError.message);
                return { success: false, error: insertError.message };
            }
        }

        return { success: true, user: user };
    } catch (error) {
        console.error("Erreur inattendue :", error);
        return { success: false, error: error.message };
    }
}


// --- 4. FONCTION DE CONNEXION ---
async function handleLogin(email, password) {
    try {
        const { user, error } = await supabase.auth.signIn({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Erreur lors de la connexion :", error.message);
            return { success: false, error: error.message };
        }

        return { success: true, user: user };
    } catch (error) {
        console.error("Erreur inattendue :", error);
        return { success: false, error: error.message };
    }
}


// --- 5. FONCTION DE DÉCONNEXION ---
function logout() {
    localStorage.removeItem('user_session');
    // On ne fait pas localStorage.clear() pour garder le compte enregistré sur l'ordi !
    window.location.href = "index.html";
}