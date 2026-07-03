# Checklist de smoke-test — Épico

Parcours manuels à exécuter **avant de merger `dev` dans `main`**, puis **après la migration DB (lot 10)** pour prouver la parité. Coche chaque ligne. Teste sur `https://localhost:3000` (`npm run dev`).

> Prérequis : les migrations SQL des lots 02 et 04 doivent être appliquées à la base testée (`supabase/migrations/*payment_idempotency.sql` et `*login_rate_limit.sql`).

## Authentification
- [ ] **Inscription** : créer un compte (infos → SMS OTP → compte créé, cookie posé, redirection).
- [ ] **OTP invalide** : saisir un mauvais code → refus + compteur de tentatives décrémente.
- [ ] **OTP — cookie** : décoder le cookie `phone_otp` (base64) → le code à 6 chiffres **n'apparaît pas** (seul un hash). 
- [ ] **Login OK** : se connecter avec les bons identifiants.
- [ ] **Login KO** : mauvais mot de passe → « Identifiants incorrects » (401).
- [ ] **Verrouillage** : 5 échecs de suite sur le même email → 6ᵉ tentative renvoie 429.
- [ ] **Logout** : déconnexion → cookie retiré, accès aux pages protégées bloqué.

## Autorisation (proxy + rôles)
- [ ] Non connecté : `GET /api/admin/users` → 401 (jamais 200 avec des données).
- [ ] Connecté non-admin : accès à `/admin` → redirigé vers `/home`.
- [ ] Admin : `/admin` et ses sous-pages s'affichent, les données chargent.
- [ ] Producteur : `/producteur` et ses routes fonctionnent ; un non-producteur est refusé.

## Panier & paiement
- [ ] Ajouter des produits → le total affiché applique bien les remises (`discount_percent`).
- [ ] **Prix serveur** : le montant Mollie == total affiché au panier (pas le prix brut).
- [ ] Paiement Mollie de bout en bout → redirection confirmation → vente enregistrée, stock décrémenté **une seule fois**.
- [ ] **Idempotence** : rejouer la vérification (recharger la page confirmation) ne recrée pas la vente ni ne redécrémente le stock.
- [ ] `total_spent` de l'utilisateur incrémenté du bon montant.

## Porte
- [ ] Connecté + téléphone vérifié + à portée GPS → ouverture (confirmation ESP32/LED).
- [ ] Téléphone non vérifié → refus 403.
- [ ] Trop loin (GPS hors rayon) → refus avec distance.

## Profil & avatars (⚠️ Storage — point clé de la migration)
- [ ] Modifier le profil (nom, adresse) → persisté.
- [ ] **Upload avatar** → image visible, ancienne supprimée.
- [ ] **Suppression avatar** → retiré.
- [ ] Après migration : vérifier que les avatars **existants** s'affichent toujours (URLs migrées).

## Divers
- [ ] Scanner un code-barres → fiche produit s'ouvre.
- [ ] Signalement (même en visiteur) → enregistré.
- [ ] Listes sauvegardées : créer / relire / supprimer.
- [ ] News : liste visible.

---

**Note migration** : `avatars` est un bucket Supabase Storage, **pas** une table SQL → il ne figure pas dans `baseline.sql`. Sa migration (fichiers + URLs en base) se vérifie via la section Profil ci-dessus.
