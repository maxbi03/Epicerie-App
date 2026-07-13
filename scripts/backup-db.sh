#!/usr/bin/env bash
# Sauvegarde la base Postgres locale (conteneur epico-postgres) dans backups/.
# Format custom pg_dump (-F c) : compressé, restaurable sélectivement.
# Portable Mac/Linux natif, Windows via Git Bash ou WSL (Docker Desktop).
#
# Usage : ./scripts/backup-db.sh [nom_conteneur] [rétention_jours]
set -euo pipefail

CONTAINER="${1:-epico-postgres}"
RETENTION_DAYS="${2:-14}"
DB_USER="epico"
DB_NAME="epico"

cd "$(dirname "$0")/.."
mkdir -p backups

STAMP=$(date +%Y%m%d_%H%M%S)
OUT="backups/epico_${STAMP}.dump"

echo "→ Dump de la base '$DB_NAME' (conteneur $CONTAINER)..."
docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -f "/tmp/epico_${STAMP}.dump"
docker cp "$CONTAINER:/tmp/epico_${STAMP}.dump" "$OUT"
docker exec "$CONTAINER" rm -f "/tmp/epico_${STAMP}.dump"

SIZE=$(du -h "$OUT" | cut -f1)
echo "✅ Sauvegarde créée : $OUT ($SIZE)"

# Rétention : supprime les dumps plus vieux que RETENTION_DAYS
find backups -name 'epico_*.dump' -mtime "+${RETENTION_DAYS}" -print -delete | sed 's/^/  supprimé (ancien) : /'

echo ""
echo "⚠️  Rappel : ces dumps sont sur CE disque. Copie régulièrement backups/ vers un"
echo "   emplacement hors de cette machine (disque externe, cloud) — un seul laptop"
echo "   = un seul point de défaillance."
