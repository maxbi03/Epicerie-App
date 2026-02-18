// =============================
// 1. Charger le Header + Menu
// =============================
async function initAppShell() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    try {
        const response = await fetch('header.html');
        const html = await response.text();
        headerContainer.innerHTML = html;
        
        // Mettre à jour le titre de la page dynamiquement
        updatePageTitle();

        // Activer bouton logout si présent
        bindLogoutButton();

    } catch (err) {
        console.error("Erreur chargement header.html:", err);
    }
}


// =============================
// 2. Menu latéral toggle
// =============================
function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    if (!menu || !overlay) return;
    
    if (menu.classList.contains('-translate-x-full')) {
        overlay.classList.remove('hidden');
        setTimeout(() => {
            overlay.classList.add('opacity-100');
            menu.classList.remove('-translate-x-full');
        }, 10);
    } else {
        menu.classList.add('-translate-x-full');
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}


// =============================
// 3. Titre dynamique header
// =============================
function updatePageTitle() {
    const titleElement = document.getElementById('page-title');
    const path = window.location.pathname.split("/").pop();
    
    const pageNames = {
        'home.html': 'Accueil',
        'news.html': 'Le Fil Rouge',
        'scanner.html': 'Scanner',
        'panier.html': 'Mon Panier',
        'map.html': 'Carte des épiceries',
        'stock.html': 'État des stocks',
        'profil.html': 'Mon Profil'
    };

    if (titleElement && pageNames[path]) {
        titleElement.innerText = pageNames[path];
    }
}


// =============================
// 4. Bouton DECONNEXION
// =============================
function bindLogoutButton() {
    const btn = document.getElementById('logout-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {

        try {
            // logout() est défini dans auth.js
            if (window.logout) {
                await window.logout();
            } else {
                // fallback sécurité
                window.location.href = "index.html";
            }
        } catch (e) {
            console.error("Erreur logout:", e);
            window.location.href = "index.html";
        }

    });
}


// =============================
// 5. Init
// =============================
window.addEventListener('DOMContentLoaded', initAppShell);