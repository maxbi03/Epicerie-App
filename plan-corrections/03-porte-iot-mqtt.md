# Modèle recommandé : Opus 4.8 (claude-opus-4-8)
Sécurité d'un accès physique + protocole anti-rejeu + firmware embarqué (ESP32/Arduino). Impact réel : ouverture d'une porte. Raisonnement cryptographique requis.

---

## Contexte

L'app ouvre la porte physique d'une épicerie autonome. Flux : `app/home/page.js` (check GPS haversine) → `POST /api/door/unlock` → publish MQTT → un ESP32 (firmware dans `Epico-door/`, projet PlatformIO) active le relais → confirmation renvoyée sur un topic status.

Fichiers clés :
- `app/api/door/unlock/route.js` — vérifie session JWT + `phone_verified` + distance GPS, puis publie sur MQTT.
- `Epico-door/` — firmware ESP32, secret partagé dans `config.h` (`UNLOCK_SECRET`), doit matcher `DOOR_SECRET` de `.env.local`.

Lis `CLAUDE.md` ET la section firmware. **Ne modifie pas le circuit physique.** Réponds en français, mets à jour `lecon.md`.

## Problèmes à corriger

### 1. 🔴 Secret en clair sur un broker MQTT public
`app/api/door/unlock/route.js` fait `client.publish(MQTT_TOPIC, 'unlock:' + DOOR_SECRET)` vers `broker.hivemq.com:1883` par défaut — broker **public, sans TLS, sans auth**. N'importe qui abonné à `epico/door/command` capture le secret une fois, puis le rejoue pour ouvrir la porte sans passer par l'app.

De plus, le fallback hardcodé `DOOR_SECRET || 'secret-de-ouf'` est un secret par défaut dangereux.

### 2. 🔴 Pas de protection anti-rejeu
Même sur un broker privé, le message `unlock:<secret>` est constant : quiconque le capture peut le rejouer.

## Travail demandé

### A. Broker MQTT privé + TLS + credentials
- Migrer vers un broker privé authentifié (HiveMQ Cloud a un tier gratuit avec TLS + user/pass, ou Mosquitto self-hosted avec TLS). Utiliser `mqtts://` (port 8883).
- Côté serveur : lire `MQTT_BROKER`, `MQTT_USERNAME`, `MQTT_PASSWORD` depuis l'env, passer les credentials à `mqtt.connect(url, { username, password })`. Retirer tout défaut public codé en dur ; si les variables manquent, échouer explicitement.
- Documenter les nouvelles variables d'env dans `CLAUDE.md`.

### B. Token anti-rejeu signé (remplace le secret statique)
Concevoir un message d'ouverture non rejouable :
- Le serveur génère un token = HMAC-SHA256 sur un payload `{ nonce, expiry_timestamp }` avec `DOOR_SECRET` comme clé, expirant ~30 s après émission. Publier `{ nonce, exp, hmac }` (JSON) sur le topic command.
- L'ESP32 vérifie le HMAC avec son `UNLOCK_SECRET`, rejette si `exp` dépassé, et rejette tout `nonce` déjà vu récemment (garder une petite fenêtre de nonces en RAM). N'active le relais que si tout est valide.
- Un message capturé devient inutile après 30 s / après première utilisation.
- Fournir le SQL/rien côté DB (rien nécessaire), mais fournir le code serveur ET les modifs firmware (`Epico-door/src/*`) avec une lib HMAC-SHA256 compatible ESP32 (mbedTLS est disponible sur ESP32).

### C. Retirer le fallback dangereux
Supprimer `'secret-de-ouf'`. Si `DOOR_SECRET` est absent, la route doit renvoyer une 500 explicite plutôt que d'utiliser un secret connu.

## Notes / limites
- La position GPS envoyée dans le body est spoofable (curl). Ce n'est pas l'objet principal de ce lot, mais mentionne-le : la vraie garantie de sécurité est l'auth + le token anti-rejeu, pas le GPS. Le GPS reste un garde-fou UX, pas une mesure de sécurité.
- `TEST_MODE true` dans le firmware active la LED D2 au lieu du relais — utile pour tester la vérif HMAC sans ouvrir la vraie porte. Tester d'abord en `TEST_MODE`.

## Critères de validation
- Aucun secret statique ni URL de broker public dans le code.
- Un message MQTT `unlock` capturé et rejoué > 30 s plus tard, ou une 2e fois, est refusé par l'ESP32.
- Le flux légitime (app → serveur → ESP32 → confirmation) fonctionne en `TEST_MODE`.
- `npm run build` passe côté app.

## Attention
- Le firmware et le serveur partagent le secret et l'algo HMAC : ils doivent rester synchronisés. Documenter la procédure de rotation du secret.
- Ne pas toucher au câblage / au code du relais lui-même, seulement à la logique de vérification du message.
