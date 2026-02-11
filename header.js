// 1. Charger le Header et le Menu automatiquement
async function initAppShell() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    try {
        const response = await fetch('header.html');
        const html = await response.text();
        headerContainer.innerHTML = html;
        
        // Mettre à jour le titre de la page dynamiquement
        updatePageTitle();
    } catch (err) {
        console.error("Erreur chargement header.html:", err);
    }
}

// 2. Gérer l'ouverture/fermeture du menu latéral
function toggleMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    
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

// 3. Changer le titre du Header selon le nom du fichier
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

// Lancer le chargement au démarrage
window.addEventListener('DOMContentLoaded', initAppShell);