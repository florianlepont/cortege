#!/usr/bin/env bash
#
# Unattended PostgreSQL backup for the Cortege stack (Phase 11, REQ-INF-backups).
#
# Runs `pg_dump` (custom format, so `pg_restore` can restore it selectively and in
# parallel) inside the running `postgres` container, writes it to $BACKUP_DIR with a
# timestamped name, checks it is not suspiciously small, and prunes dumps older than
# $RETENTION_DAYS. Intended to run unattended from cortege-backup.timer (see README.md,
# "Backups"), but takes the same $REPO_DIR/$ENV_FILE/$COMPOSE_FILE convention as
# update-stack.sh so it can also be run by hand or pointed at another compose file
# (infra/docker-compose.yml) for a local rehearsal.
#
# Restore: infra/vps/restore-postgres.sh. Always rehearse both together against a
# disposable database before trusting a change to either script.

set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/cortege}"
ENV_FILE="${ENV_FILE:-/home/ubuntu/cortege.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_DIR/infra/docker-compose.vps.yml}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"

log() { printf '%s %s\n' "$(date -Is)" "$*"; }

compose() {
  if [ -f "$ENV_FILE" ]; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

[ -f "$COMPOSE_FILE" ] || { log "ERROR: $COMPOSE_FILE not found"; exit 1; }

# Resolve the real database name and user from the running container's own
# environment, so this never drifts from what the API actually connects to
# (the compose file derives both from the env file, with dev-friendly defaults).
pg_user="$(compose exec -T "$POSTGRES_SERVICE" printenv POSTGRES_USER)"
pg_db="$(compose exec -T "$POSTGRES_SERVICE" printenv POSTGRES_DB)"

mkdir -p "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$BACKUP_DIR/cortege-postgres-$timestamp.dump"
tmp="$dest.part"

log "backing up database '$pg_db' (user '$pg_user') to $dest"
if ! compose exec -T "$POSTGRES_SERVICE" pg_dump -U "$pg_user" -d "$pg_db" --format=custom > "$tmp"; then
  log "ERROR: pg_dump failed, discarding partial file"
  rm -f "$tmp"
  exit 1
fi

# A dump of an initialised, non-empty Cortege database is always well over 1 KiB
# (schema alone is several hundred statements); anything smaller means pg_dump ran
# against an empty or unreachable database, which must not silently become "the
# backup" and push out a good one during pruning.
size="$(stat -c%s "$tmp" 2>/dev/null || stat -f%z "$tmp")"
if [ "${size:-0}" -lt 1024 ]; then
  log "ERROR: dump is suspiciously small ($size bytes), discarding"
  rm -f "$tmp"
  exit 1
fi

mv "$tmp" "$dest"
log "backup OK: $dest ($size bytes)"

pruned=0
while IFS= read -r -d '' old; do
  rm -f "$old"
  log "pruned old backup: $old"
  pruned=$((pruned + 1))
done < <(find "$BACKUP_DIR" -maxdepth 1 -name 'cortege-postgres-*.dump' -mtime "+$RETENTION_DAYS" -print0)

log "done ($pruned old backup(s) pruned, retention ${RETENTION_DAYS}d)"
