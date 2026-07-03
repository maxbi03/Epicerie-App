# Modèle recommandé : Haiku 4.5 (claude-haiku-4-5-20251001)
Nettoyage mécanique à faible risque (suppression de doublons, code mort, logs). Rapide et peu coûteux — Haiku suffit largement. Passer à Sonnet uniquement si une suppression s'avère ambiguë.

---

## Contexte

App Next.js 16. Quelques scories de vibecoding à nettoyer. Lis `CLAUDE.md`. Réponds en français, mets à jour `lecon.md`.

## Travail demandé

### 1. Doublon de lib PWA
`package.json` liste **deux** libs PWA : `next-pwa` (^5.6.0, non maintenue) ET `@ducanh2912/next-pwa` (^10.x, le fork maintenu). Déterminer laquelle est réellement utilisée (chercher l'import dans `next.config.*`), supprimer l'autre de `package.json`, puis `npm install`. Vérifier que le build PWA fonctionne toujours (`public/sw.js` régénéré correctement).

### 2. Code mort
- `app/lib/supabaseClient.js` (client anon) : vérifier s'il est importé quelque part (`grep -rn supabaseClient app/`). S'il est inutilisé ET que le lot 05 (RLS) a confirmé qu'aucun accès anon front n'est nécessaire, le supprimer. **Ne pas supprimer sans cette confirmation** — coordonner avec le lot 05.
- `app/api/reports/route.js` importe `requireAuth` depuis `../../lib/auth`, mais cette fonction **n'existe pas** dans `app/lib/auth.js`. Soit l'import est mort (le supprimer), soit il révèle un bug (la route est censée exiger une auth). Vérifier l'intention : le commentaire dit « Allow visitors (no auth required) », donc l'import est probablement un reliquat → le supprimer.
- Chercher d'autres imports non résolus / variables inutilisées signalés par `npm run lint`.

### 3. Logs sensibles / verbeux en production
Retirer ou réduire les `console.log` qui exposent des données sensibles ou polluent les logs de prod :
- `app/api/checkout/route.js` : `console.log('Creating Mollie payment:', JSON.stringify(paymentData))` (expose la metadata).
- `app/api/door/unlock/route.js` : logs d'email + distance.
- Logs de webhook exposant items/noms.
Garder un logging minimal utile (id de paiement, statut) mais pas les payloads complets. Ne pas retirer les `console.error` légitimes.

### 4. `NEXT_PUBLIC_ADMIN_EMAIL`
Si le lot 01 a supprimé l'usage de cette variable, vérifier qu'elle n'est plus référencée nulle part et la retirer de la doc / `.env.example` s'il existe.

## Critères de validation
- Une seule lib PWA dans `package.json`, build OK.
- `npm run lint` ne signale plus d'imports/variables morts (ceux traités ici).
- Aucun payload sensible loggué dans les routes paiement/porte.
- `npm run build` passe.

## Attention
- Ne rien supprimer qui soit utilisé dynamiquement (imports lazy, `await import(...)`). Grep large avant chaque suppression.
- Coordonner la suppression de `supabaseClient.js` avec le lot 05 (RLS).
