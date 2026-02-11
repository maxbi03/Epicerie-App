function handleLogin() {
    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;

    if (!phone || !password) {
        alert("Merci de remplir tous les champs !");
        return;
    }

    // Simulation de connexion
    const userData = {
        name: "Maxime", // Nom par défaut pour le test
        phone: phone,
        points: 150
    };

    localStorage.setItem('user_session', JSON.stringify(userData));
    window.location.href = "home.html"; // Redirige vers l'accueil après connexion
}

function handleSignup() {
    alert("Fonctionnalité d'inscription bientôt disponible !");
}