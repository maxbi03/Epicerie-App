#!/usr/bin/env bash
# Restaure un dump pg_dump (-F c) dans la base Postgres locale.
# ⚠️ DESTRUCTIF sur la base cible : écrase les données existantes.
#
# Usage : ./scripts/restore-db.sh <fichier.dump> [nom_conteneur] [nom_base]
set -euo pipefail

DUMP_FILE="${1:?Usage: restore-db.sh <fichier.dump> [conteneur] [base]}"
CONTAINER="${2:-epico-postgres}"
DB_NAME="${3:-epico}"
DB_USER="epico"

if [ ! -f "$DUMP_FILE" ]; then
  echo "❌ Fichier introuvable : $DUMP_FILE"
  exit 1
fi

echo "⚠️  Ceci va ÉCRASER la base '$DB_NAME' du conteneur '$CONTAINER' avec le contenu de :"
echo "    $DUMP_FILE"
read -r -p "Continuer ? (taper 'oui' pour confirmer) : " CONFIRM
if [ "$CONFIRM" != "oui" ]; then
  echo "Annulé."
  exit 1
fi

BASENAME=$(basename "$DUMP_FILE")
docker cp "$DUMP_FILE" "$CONTAINER:/tmp/$BASENAME"

echo "→ Restauration en cours..."
docker exec "$CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner "/tmp/$BASENAME"
docker exec "$CONTAINER" rm -f "/tmp/$BASENAME"

echo "✅ Restauration terminée."
