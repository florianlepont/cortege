#!/usr/bin/env bash
#
# Restore a backup-postgres.sh dump into a brand-new database (Phase 11, REQ-INF-backups).
#
# Usage: restore-postgres.sh <dump-file> [target-database]
#
# Always creates $target-database and refuses if it already exists: this script never
# overwrites the live database, so it is safe to run as a routine restore rehearsal
# next to a running stack. A real disaster restore (replacing the live database) is a
# deliberate, separate operation — see README.md, "Restoring the database", including
# the xid8 fix-up the sync feed needs after any logical restore.

set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/ubuntu/cortege}"
ENV_FILE="${ENV_FILE:-/home/ubuntu/cortege.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$REPO_DIR/infra/docker-compose.vps.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"

log() { printf '%s %s\n' "$(date -Is)" "$*"; }

usage() {
  echo "Usage: $0 <dump-file> [target-database]" >&2
  exit 1
}

dump_file="${1:-}"
[ -n "$dump_file" ] || usage
[ -f "$dump_file" ] || { log "ERROR: $dump_file not found"; exit 1; }

compose() {
  if [ -f "$ENV_FILE" ]; then
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

[ -f "$COMPOSE_FILE" ] || { log "ERROR: $COMPOSE_FILE not found"; exit 1; }

pg_user="$(compose exec -T "$POSTGRES_SERVICE" printenv POSTGRES_USER)"
target_db="${2:-restore_check_$(date -u +%Y%m%dT%H%M%SZ)}"

# Bound to a safe identifier shape: this name is interpolated into SQL and passed to
# createdb/dropdb, and while this script is operator-run (not attacker-reachable), a
# durable-backend phase is not the place to add a new place where that would matter.
if ! [[ "$target_db" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  log "ERROR: '$target_db' is not a valid database name (letters, digits, underscore only)"
  exit 1
fi

exists="$(compose exec -T "$POSTGRES_SERVICE" psql -U "$pg_user" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$target_db'" | tr -d '[:space:]')"
if [ "$exists" = "1" ]; then
  log "ERROR: database '$target_db' already exists; pick a different name or drop it first"
  exit 1
fi

log "creating clean database '$target_db'"
compose exec -T "$POSTGRES_SERVICE" createdb -U "$pg_user" "$target_db"

log "restoring $dump_file into '$target_db'"
compose exec -T "$POSTGRES_SERVICE" pg_restore -U "$pg_user" -d "$target_db" --no-owner --no-privileges \
  < "$dump_file"

table_count="$(compose exec -T "$POSTGRES_SERVICE" psql -U "$pg_user" -d "$target_db" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d '[:space:]')"
survey_count="$(compose exec -T "$POSTGRES_SERVICE" psql -U "$pg_user" -d "$target_db" -tAc \
  "SELECT count(*) FROM surveys" | tr -d '[:space:]')"

log "restore OK: '$target_db' has $table_count tables and $survey_count row(s) in surveys"
if [ -f "$ENV_FILE" ]; then
  log "drop it when done: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec $POSTGRES_SERVICE dropdb -U $pg_user $target_db"
else
  log "drop it when done: docker compose -f $COMPOSE_FILE exec $POSTGRES_SERVICE dropdb -U $pg_user $target_db"
fi
