#!/bin/bash
# Applies every db/migrations/*.sql VERBATIM on first DB init — REAL PostGIS, no stubbing.
# Runs last (99-) so the postgis image has already enabled the extension; 0001's
# CREATE EXTENSION IF NOT EXISTS postgis is then a harmless no-op.
set -euo pipefail
echo "── soihop: applying migrations (real PostGIS) ──"
for f in /migrations/0*.sql; do
  echo "   apply $(basename "$f")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q -f "$f"
done
echo "── soihop: schema ready ($(psql -tA --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'") tables) ──"
