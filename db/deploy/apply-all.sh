#!/usr/bin/env bash
# ============================================================================
# apply-all.sh — apply the FULL migration set (0001..0015) to a REAL
# PostgreSQL + PostGIS target (Supabase, or a local real-PostGIS cluster).
# Unlike db/test/*, this applies the migrations VERBATIM (PostGIS enabled).
#
# Usage:
#   DATABASE_URL=postgres://postgres:PASS@db.<ref>.supabase.co:5432/postgres \
#     bash db/deploy/apply-all.sh
#
# Optional (provision the app login roles the deployed apps connect as):
#   MONEY_WRITER_PASSWORD=...   -> gives money_writer LOGIN (the NestJS money-plane)
#   READONLY_PASSWORD=...       -> creates a SELECT-only role (admin/consumer reads)
#
# Idempotent-ish: re-running re-applies CREATE OR REPLACE fns + IF NOT EXISTS DDL;
# 0002 (tables) and 0004 (seed) use IF NOT EXISTS / ON CONFLICT, so a re-run is safe.
# ============================================================================
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to the target Postgres (Supabase) connection string}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; MIG="$ROOT/db/migrations"
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

echo "Target: ${DATABASE_URL%%\?*}"
echo "PostGIS check (Supabase: enable in Dashboard → Database → Extensions, or it auto-creates in 0001)…"

for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0013 0014 0015 0016 0017 0018 0019 0020 0021 0022; do
  f=$(ls "$MIG/${n}"*.sql)
  printf 'apply %s  %s\n' "$n" "$(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

if [[ -n "${MONEY_WRITER_PASSWORD:-}" ]]; then
  echo "→ money_writer: enabling LOGIN for the money-plane API"
  "${PSQL[@]}" -c "ALTER ROLE money_writer WITH LOGIN PASSWORD '${MONEY_WRITER_PASSWORD}';"
fi

if [[ -n "${READONLY_PASSWORD:-}" ]]; then
  echo "→ app_readonly: SELECT-only role for admin/consumer reads"
  "${PSQL[@]}" <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_readonly') THEN
    CREATE ROLE app_readonly LOGIN PASSWORD '${READONLY_PASSWORD}';
  ELSE
    ALTER ROLE app_readonly WITH LOGIN PASSWORD '${READONLY_PASSWORD}';
  END IF;
END \$\$;
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_readonly;
SQL
fi

echo "── done ──"
echo "tables:       $("${PSQL[@]}" -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"
echo "txn types:    $("${PSQL[@]}" -tA -c "SELECT count(*) FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='txn_type'")"
echo "money fns:    $("${PSQL[@]}" -tA -c "SELECT count(*) FROM pg_proc WHERE proname LIKE 'fn_%'")"
echo "seed city:    $("${PSQL[@]}" -tA -c "SELECT code FROM cities WHERE code='CNX'")"
