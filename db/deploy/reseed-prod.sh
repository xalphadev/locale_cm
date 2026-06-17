#!/usr/bin/env bash
# ============================================================================
# reseed-prod.sh — replace the server's demo data with the REAL Chiang Mai dataset.
#
# DESTRUCTIVE: wipes ALL data (keeps only reference tables: cities/districts/
# place_categories/roles/platform_config), then loads ~30 real CM venues + reviews/
# deals/events/quest/feed/products/stays. Safe for a pre-launch demo server.
#
# It backs up first and asks you to confirm. Runs against the dockerised Postgres
# (container `locale-db`). Run ON THE SERVER HOST, after `git pull origin main`:
#
#   bash db/deploy/reseed-prod.sh          # interactive — asks to type WIPE
#   bash db/deploy/reseed-prod.sh --yes    # non-interactive (CI/cron)
#
# Override defaults via env: DB_CONTAINER (locale-db) · DB_USER (postgres) ·
#   DB_NAME (locale) · BACKUP_DIR ($HOME)
#
# After this, rebuild the app code:  bash db/deploy/deploy.sh
# ============================================================================
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-locale-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-locale}"
BACKUP_DIR="${BACKUP_DIR:-$HOME}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FORCE=0; [ "${1:-}" = "--yes" ] && FORCE=1

dpsql() { docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" "$@"; }

# 0) container up?
docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER" \
  || { echo "✗ container '$DB_CONTAINER' is not running (set DB_CONTAINER=…)"; exit 1; }

# 1) show what is about to be wiped (a real-data sanity check)
echo "── current data in '$DB_NAME' (will be WIPED) ──"
dpsql -tA -c "SELECT 'places='||count(*) FROM places" || { echo "✗ cannot reach DB"; exit 1; }
dpsql -tA -c "SELECT 'merchant_accounts='||count(*) FROM merchant_accounts"
dpsql -tA -c "SELECT 'users='||count(*) FROM users"
dpsql -tA -c "SELECT 'settled_redemptions='||count(*) FROM redemptions WHERE status='settled'"
echo "⚠  If any of the above is REAL (paying merchants / live users / settled money), STOP now."

# 2) confirm
if [ "$FORCE" -ne 1 ]; then
  printf 'Type WIPE to replace all data with the real CM dataset: '
  read -r ans
  [ "$ans" = "WIPE" ] || { echo "aborted."; exit 1; }
fi

# 3) backup first — abort the whole run if the dump is empty
TS="$(date +%F-%H%M%S)"; BK="$BACKUP_DIR/locale-backup-$TS.sql.gz"
echo "── backup → $BK ──"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BK"
[ -s "$BK" ] || { echo "✗ backup is empty — aborting BEFORE any wipe"; rm -f "$BK"; exit 1; }
echo "   ok ($(du -h "$BK" | cut -f1))"

# 4) migration 0027 (idempotent: ADD COLUMN/CREATE TABLE IF NOT EXISTS)
echo "── apply migration 0027 (claim verification) ──"
dpsql < "$ROOT/db/migrations/0027_claim_verification.sql"

# 5) reseed — wipe + load real Chiang Mai data
echo "── load real Chiang Mai dataset (this truncates + rebuilds) ──"
dpsql < "$ROOT/db/test/seed-real-cm.sql"

# 6) re-apply role grants — needed so app_content can write the new place_claims table
echo "── re-apply app-role grants ──"
dpsql < "$ROOT/db/deploy/grants_app_roles.sql"

# 7) summary
echo "── done ──"
dpsql -tA -c "SELECT 'places='||count(*)
  ||' areas='||(SELECT count(*) FROM (SELECT 1 FROM places WHERE district_id IS NOT NULL GROUP BY district_id) z)
  ||' reviews='||(SELECT count(*) FROM reviews)
  ||' deals='||(SELECT count(*) FROM deals WHERE status='active') FROM places"
echo
echo "Next:"
echo "  1) rebuild the app code →  bash db/deploy/deploy.sh   (re-grants, rebuilds web/consumer, skips seed+migration)"
echo "  2) (optional) demo merchant logins (needs node on host):"
echo "     ( cd apps/web && DATABASE_URL=\"postgres://postgres:\$POSTGRES_PASSWORD@127.0.0.1:54400/$DB_NAME\" node ../../db/test/seed-merchant-logins.mjs )"
echo "  rollback if needed:  gunzip -c $BK | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME"
