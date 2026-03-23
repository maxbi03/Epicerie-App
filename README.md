# L'Épicerie du Village — Application

Application de gestion pour une épicerie autonome (sans personnel) située à Semsales, Suisse. Permet aux clients de s'inscrire, scanner des produits, remplir un panier et payer via leur téléphone.

**Stack :** Next.js 16 · React 19 · Supabase · Mollie · Tailwind CSS 4 · PWA

---

## Structure du projet

```
app/
├── api/                    # Routes API (backend)
│   ├── products/           # GET — récupère tous les produits
│   ├── users/              # POST — crée un profil utilisateur
│   ├── users/[id]/         # GET/PATCH — lecture/mise à jour d'un profil
│   └── checkout/           # POST — crée un paiement Mollie
│       └── webhook/        # POST — reçoit la confirmation de paiement
├── components/
│   └── Header.jsx          # Navigation principale, menu, compteur panier
├── lib/                    # Utilitaires et services
│   ├── supabaseClient.js   # Instance Supabase côté client
│   ├── supabaseServer.js   # Instance Supabase côté serveur (admin)
│   ├── userService.js      # Fonctions API profil utilisateur
│   ├── productsService.js  # Fonctions de récupération des produits
│   └── updateStock.js      # Décrémente le stock après paiement
├── styles/
│   └── globals.css         # Styles globaux (Tailwind + custom)
│
│   # — Pages —
├── page.js                 # Connexion / inscription
├── home/                   # Tableau de bord après connexion
├── scanner/                # Scanner de codes-barres (EAN-13)
├── panier/                 # Panier d'achat
│   └── confirmation/       # Page de confirmation de commande
├── stock/                  # Catalogue produits avec stock en temps réel
├── profil/                 # Profil utilisateur et paramètres
├── news/                   # Actualités, offres, événements
├── map/                    # Localisation du magasin (OpenStreetMap)
├── inscription/            # Inscription avec vérification téléphone
└── layout.js               # Layout racine (Header + providers)

supabase/
├── config.toml             # Configuration Supabase locale
└── functions/
    └── address-search/     # Edge function — recherche d'adresse suisse (api3.geo.admin.ch)

public/
├── manifest.json           # Manifeste PWA
├── sw.js                   # Service worker (offline)
└── icons/                  # Icônes de l'application
```

---

## Flux de données

### Authentification

```
Utilisateur
  │
  ├─ Inscription ─→ Saisie infos + téléphone
  │                    │
  │                    ├─ OTP SMS (Supabase Auth)
  │                    ├─ Vérification du code
  │                    ├─ Création compte (signUp)
  │                    └─ POST /api/users → table 'users'
  │
  └─ Connexion ───→ Email + mot de passe
                       │
                       └─ Supabase signInWithPassword()
                            → session JWT → redirect /home
```

- **Mode visiteur** disponible (accès limité, pas de paiement)
- Mot de passe : minimum 10 caractères, majuscule, chiffre, symbole

### Produits & Scanner

```
Scanner / Stock page
  │
  └─ fetchProducts() → GET /api/products
                          │
                          └─ Supabase 'products' table
                               │
                               └─ Réponse normalisée
                                    │
                                    └─ Cache localStorage ('products_cache')
                                         │
                                         └─ Matching code-barres dans le scanner
```

Le scanner utilise la librairie **html5-qrcode** pour lire les codes EAN-13. Un fallback de saisie manuelle est disponible.

### Panier & Paiement

```
Scan produit → addToBasket() → localStorage ('user_basket')
                                  │
                                  └─ Événement 'cart-updated' → Header met à jour le compteur

Validation panier
  │
  └─ POST /api/checkout { items, total }
       │
       └─ Mollie API → crée un paiement en CHF
            │
            └─ Redirect vers page Mollie
                 │
                 └─ Paiement complété
                      │
                      └─ Webhook Mollie → POST /api/checkout/webhook
                           │
                           ├─ Vérifie statut = 'paid'
                           └─ updateStockAfterPayment()
                                → décrémente stock_shelf pour chaque article
```

### Profil utilisateur

```
GET /api/users/[id]  → lecture profil depuis Supabase
PATCH /api/users/[id] → mise à jour (nom, téléphone, etc.)
```

---

## Base de données (Supabase)

### Table `users`

| Colonne | Description |
|---------|-------------|
| id | UUID (lié à Supabase Auth) |
| name, email, phone | Infos de base |
| street, house_number, postal_code, city, country | Adresse |
| address_verified, phone_verified | Statuts de vérification |

### Table `products`

| Colonne | Description |
|---------|-------------|
| id | Identifiant du produit |
| name, barcode | Nom et code EAN-13 |
| price_chf | Prix en francs suisses |
| category, unit | Catégorie et unité |
| stock_shelf, stock_total | Stock en rayon / total |
| image_url | Image du produit |

---

## Intégrations externes

| Service | Usage |
|---------|-------|
| **Supabase** | Auth, base de données, edge functions |
| **Mollie** | Paiement en ligne (CHF) |
| **api3.geo.admin.ch** | Autocomplétion d'adresses suisses |
| **OpenStreetMap** | Carte de localisation du magasin |

---

## Dépendances (node_modules)

### Production

| Package | Rôle |
|---------|------|
| **next** (16.1.7) | Framework principal. Gère le routing, le rendu côté serveur (SSR), les API routes, l'optimisation d'images et le bundling |
| **react** (19.2.3) | Librairie UI. Construction de l'interface avec des composants, gestion du state (`useState`, `useEffect`, etc.) |
| **react-dom** (19.2.3) | Lien entre React et le navigateur. Transforme les composants React en éléments HTML dans le DOM |
| **@supabase/supabase-js** | Client Supabase. Authentification (OTP SMS, login), requêtes base de données (produits, users), appels aux edge functions |
| **@mollie/api-client** | Client API Mollie. Création des paiements en CHF côté serveur (`/api/checkout`) et vérification du statut via webhook |
| **@ducanh2912/next-pwa** | Plugin PWA pour Next.js. Génère le service worker, gère le cache offline, permet l'installation sur l'écran d'accueil |
| **next-pwa** | Ancienne version du plugin PWA (résidu, remplacé par `@ducanh2912/next-pwa`) |
| **sharp** | Optimisation d'images côté serveur. Utilisé automatiquement par Next.js pour redimensionner/compresser les images des produits |

### Développement

| Package | Rôle |
|---------|------|
| **tailwindcss** (v4) | Framework CSS utilitaire. Toutes les classes comme `bg-green-600`, `rounded-xl`, `dark:bg-gray-900` |
| **@tailwindcss/postcss** | Plugin PostCSS pour Tailwind v4. Transforme les classes Tailwind en CSS final au build |
| **eslint** | Linter JavaScript. Détecte les erreurs de code, variables inutilisées, imports manquants |
| **eslint-config-next** | Configuration ESLint spécifique à Next.js. Règles pour les bonnes pratiques Next (Image, Link, etc.) |
| **supabase** | CLI Supabase. Lancer Supabase en local, gérer les migrations, déployer les edge functions |

> Les centaines d'autres dossiers dans `node_modules/` sont des **sous-dépendances** installées automatiquement par npm. Par exemple, `next` embarque `webpack` et `swc`, `@supabase/supabase-js` inclut `@supabase/auth-js`, `@supabase/realtime-js`, etc. Seuls les 12 packages ci-dessus sont les dépendances directes du projet.

---

## Lancer le projet

```bash
npm install
npm run dev --webpack
```

Variables d'environnement requises dans `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MOLLIE_API_KEY=
NEXT_PUBLIC_BASE_URL=
```
