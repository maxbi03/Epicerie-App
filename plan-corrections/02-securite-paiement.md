# Modèle recommandé : Opus 4.8 (claude-opus-4-8)
Logique financière : recalcul de montants, idempotence, concurrence. Une erreur ici coûte de l'argent réel. Raisonnement soigné requis.

---

## Contexte

App Next.js 16 / Supabase. Paiement via Mollie (passerelle configurable `PAYMENT_GATEWAY` dans `app/lib/config.js`, valeurs `'mollie'` ou `'payrexx'`). Fichiers concernés :
- `app/api/checkout/route.js` — crée le paiement, retourne `checkoutUrl`.
- `app/api/checkout/webhook/route.js` — confirmation asynchrone → décrémente le stock (`app/lib/updateStock.js`) + enregistre la vente + incrémente `total_spent`.
- `app/api/checkout/verify/route.js` — vérification synchrone au retour de l'utilisateur (dédup par price+receipt+fenêtre 5 min).

Lis `CLAUDE.md`. Réponds en français, pas de commentaires superflus, mets à jour `lecon.md`.

## Problèmes à corriger

### 1. 🔴 Le montant du paiement vient du client (fraude directe)
Dans `app/api/checkout/route.js`, le body contient `items`, `total` et les `price` de chaque item, tous fournis par le navigateur. Un client peut envoyer `total: 0.01` pour un panier complet.

**Correctif :** le body ne doit contenir que les identifiants produits et quantités (`[{ id, quantity }]`). Le serveur :
- charge les prix depuis Supabase (`PRODUCTS_TABLE` dans config) pour chaque `id`,
- recalcule le total côté serveur,
- rejette si un produit est introuvable ou en rupture,
- utilise **uniquement** ce total recalculé pour créer le paiement et pour la `metadata`.
Ne jamais faire confiance à un prix ou un total venant du client. Adapter le front (`app/panier/page.js`) pour n'envoyer que `id` + `quantity`.

### 2. 🔴 Dédup des ventes fragile → risque de double décrément ou vente perdue
`verify` déduplique par `(price, receipt, created_at dans les 5 dernières min)`. Deux clients achetant le même panier en < 5 min = une vente écrasée. Et le webhook Mollie (`webhook/route.js`) n'a **aucune** dédup : si Mollie retente le webhook, le stock est décrémenté deux fois.

**Correctif :** rendre l'enregistrement idempotent par `payment_id`.
- Ajouter une colonne `payment_id` (text) sur la table `sales` avec **contrainte UNIQUE**. Fournir le SQL de migration.
- Dans `webhook` et `verify`, insérer la vente avec `payment_id`. Sur conflit (déjà inséré), ne pas re-décrémenter le stock ni ré-incrémenter `total_spent`. Utiliser un `upsert`/`insert ... on conflict do nothing` et vérifier le nombre de lignes réellement insérées avant de toucher au stock.
- Supprimer la dédup approximative price+receipt une fois la contrainte unique en place.

### 3. 🟠 `total_spent` non atomique
Dans `webhook` et `verify`, le pattern est read `total_spent` puis write `total_spent + x` : perte d'écriture en cas de concurrence.

**Correctif :** créer une fonction SQL Postgres (RPC Supabase) `increment_total_spent(user_id uuid, amount int)` faisant `update users set total_spent = coalesce(total_spent,0) + amount where id = user_id`, et l'appeler via `supabase.rpc(...)`. Fournir le SQL.

### 4. 🟠 `baseUrl` dérivé du header `origin` (manipulable)
`app/api/checkout/route.js` fait `request.headers.get('origin') || 'http://localhost:3000'` pour les URLs de redirection et de webhook. Un attaquant peut détourner la redirection post-paiement.

**Correctif :** utiliser `process.env.NEXT_PUBLIC_BASE_URL` comme source de vérité (déjà dans l'env selon `CLAUDE.md`). Ne garder la détection localhost que pour le flag « ne pas enregistrer le webhook en local ».

### 5. 🟠 Webhook Payrexx non vérifié
La branche `payrexx` de `webhook/route.js` fait confiance au body POST tel quel : un faux POST `status: 'confirmed'` décrémente le stock et crée des ventes. La branche Mollie est sûre (elle re-fetch le paiement via l'API — garder ce modèle).

**Décision produit (fixée par l'utilisateur) : Mollie est la passerelle active, mais Payrexx doit rester pleinement fonctionnel et activable en changeant simplement `PAYMENT_GATEWAY` dans `app/lib/config.js`. NE PAS supprimer Payrexx.**

**Correctif :** amener la branche Payrexx au même niveau de sécurité que Mollie, sans casser la bascule.
- Re-fetch systématiquement la transaction via l'API Payrexx (comme la branche Mollie re-fetch le paiement) au lieu de croire le `status` du body. La source de vérité est l'API de la passerelle, jamais le POST reçu.
- Valider la signature du webhook si Payrexx en fournit une (vérifier la doc Payrexx : header de signature HMAC). Si une signature est disponible, la vérifier avant tout traitement.
- Appliquer à Payrexx **les mêmes garanties** que celles ajoutées pour Mollie dans ce lot : total recalculé serveur (point 1), idempotence par `payment_id` unique (point 2), `total_spent` atomique via RPC (point 3), `baseUrl` depuis l'env (point 4). Les deux branches doivent partager la même logique post-confirmation (extraire une fonction commune `finalizePaidOrder({ paymentId, items, clientName, userId, amountCents })` appelée par les deux passerelles, pour éviter que l'une diverge de l'autre).
- Vérifier que `checkout`, `webhook` ET `verify` gèrent correctement les deux valeurs de `PAYMENT_GATEWAY`, et que basculer la constante suffit (aucune autre modif de code requise).

**Test de bascule :** après correctif, mettre `PAYMENT_GATEWAY = 'payrexx'`, vérifier que checkout/verify/webhook fonctionnent, puis remettre `'mollie'`. Documenter dans `lecon.md` que la bascule se fait via cette seule constante.

### 6. 🟡 Logs sensibles
`console.log('Creating Mollie payment:', JSON.stringify(paymentData))` et logs similaires exposent la metadata (noms, items) dans les logs de prod. Réduire à un identifiant + montant.

## Critères de validation
- Un checkout avec un `total` falsifié dans le body est ignoré (le serveur facture le vrai total).
- Rejouer le même webhook deux fois ne décrémente le stock qu'une fois.
- `npm run build` et `npm run lint` passent.
- Fournir tous les scripts SQL de migration dans un fichier `supabase/migrations/` daté, prêts à exécuter.

## Attention
- Ne pas casser le flux Mollie existant, qui est la passerelle active par défaut.
- Payrexx doit rester interchangeable : la bascule se fait uniquement via `PAYMENT_GATEWAY` dans `app/lib/config.js`. Les deux passerelles doivent bénéficier des mêmes correctifs de sécurité (total serveur, idempotence, atomicité) — idéalement via une fonction post-confirmation commune. Ne pas durcir Mollie en laissant Payrexx vulnérable.
- Tester le chemin webhook ET le chemin verify (les deux peuvent enregistrer la vente ; ils doivent être mutuellement idempotents via `payment_id`), pour **chaque** passerelle.
