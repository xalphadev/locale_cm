#!/usr/bin/env bash
# ============================================================================
# run-jobs.sh — scheduled maintenance for the dockerised server (container locale-db).
# Runs the idempotent fn_run_maintenance() (deal expiry/activation, freshness decay,
# OTP sweep) and, optionally, per-city solvency reconciliation.
#
# Wire it up with cron on the server host, e.g.:
#   */15 * * * *  cd /path/to/repo && bash db/jobs/run-jobs.sh         >> /var/log/locale-jobs.log 2>&1
#   30   3 * * *  cd /path/to/repo && RECONCILE=1 bash db/jobs/run-jobs.sh  >> /var/log/locale-jobs.log 2>&1
#
# Env: DB_CONTAINER (locale-db) · DB_USER (postgres) · DB_NAME (locale) · RECONCILE (0/1)
# ============================================================================
set -euo pipefail
DB_CONTAINER="${DB_CONTAINER:-locale-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-locale}"
RECONCILE="${RECONCILE:-0}"

dpsql() { docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -tA -U "$DB_USER" -d "$DB_NAME" "$@"; }

echo "[$(date '+%F %T')] maintenance:"
dpsql -c "SELECT fn_run_maintenance();"

if [ "$RECONCILE" = "1" ]; then
  echo "[$(date '+%F %T')] reconcile solvency per city:"
  dpsql -c "SELECT code, fn_reconcile_solvency(id) AS run_id FROM cities;"
fi
