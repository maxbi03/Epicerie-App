# Modèle recommandé : Sonnet 5 (claude-sonnet-5)
Écriture de tests d'intégration ciblés. Demande de la rigueur sur les cas limites mais pas de raisonnement de sécurité inédit (les failles sont déjà connues via les lots 01-04). Sonnet convient.

---

## Contexte

App Next.js 16 / Supabase, actuellement **sans aucun test**. Les zones à plus fort risque financier / sécurité sont : le checkout/webhook (argent), l'auth (accès), et l'autorisation des routes.

Lis `CLAUDE.md`. Réponds en français, mets à jour `lecon.md`.

## Objectif

Mettre en place une base de tests d'intégration sur les chemins critiques. Pas viser 100 % de couverture : cibler ce qui coûte de l'argent ou ouvre un accès.

## Travail demandé

### 1. Outillage
Installer et configurer **Vitest** (léger, compatible ESM/Next). Ajouter un script `"test": "vitest"` et `"test:run": "vitest run"` dans `package.json`. Mocker Supabase (`getSupabaseAdmin`) et les SDK externes (Mollie, mqtt, argon2 si nécessaire) plutôt que de taper la vraie DB.

### 2. Tests prioritaires

**Checkout / paiement** (`app/api/checkout/*`) :
- Le total est recalculé côté serveur : un `total` falsifié dans le body est ignoré (cf. lot 02).
- Le webhook est idempotent : rejouer le même `payment_id` ne décrémente le stock qu'une fois.
- Un webhook avec un paiement non `paid`/`confirmed` ne touche ni stock ni ventes.

**Auth** (`app/api/auth/*`, `app/lib/auth.js`) :
- `signToken` / `verifyToken` : round-trip OK, token expiré rejeté, signature invalide rejetée.
- Login : mauvais mot de passe → 401 ; après N échecs → 429 (cf. lot 04).
- OTP : le code n'est pas récupérable en clair depuis le cookie (cf. lot 04) ; mauvais code → refus ; expiration respectée.

**Autorisation** (cf. lot 01) :
- `GET /api/admin/users` sans session → 401/403.
- `POST /api/users` avec `id` arbitraire / `phone_verified: true` → refusé ou champs ignorés.
- `requireAdmin` / `requireProducer` : refus si mauvais rôle.

**Porte** (`app/api/door/unlock`) :
- Refus si non authentifié, si `phone_verified` false, si distance > rayon.

### 3. Intégration continue (optionnel)
Proposer un workflow GitHub Actions minimal qui lance `npm run lint` + `npm run test:run` sur push/PR.

## Critères de validation
- `npm run test:run` passe et couvre au minimum les cas listés ci-dessus.
- Les tests ne dépendent d'aucune vraie clé API ni vraie DB (tout mocké).
- Les tests échouent bien si on réintroduit une des failles des lots 01-04 (vérifier en cassant volontairement un cas, puis en le remettant).

## Attention
- Ce lot dépend de l'état du code après les lots 01, 02, 04 : idéalement le faire après eux, ou écrire les tests en « spec » du comportement cible et les activer au fur et à mesure.
- Ne pas écrire de tests fragiles couplés à des détails d'implémentation (tester le comportement observable des routes).
