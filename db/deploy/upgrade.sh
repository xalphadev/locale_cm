#!/usr/bin/env bash
# upgrade.sh — apply NEW migrations to an EXISTING prod DB (the gap deploy.sh leaves on purpose:
# its step 3/8 skips ALL migrations when the schema already exists, because the early CREATE TYPE
# migrations are not idempotent). Run this from the repo root ON THE SERVER after `git pull`:
#
#   bash db/deploy/upgrade.sh 0048        # apply 0048..latest, in order, against locale-db
#
# FROM is required — re-running old non-idempotent migrations is exactly what we're avoiding.
# Each file runs with ON_ERROR_STOP so a failure halts the run at that file (fix, then re-run
# from the failed number). Newer migrations (0026+) follow the IF-NOT-EXISTS convention, so
# re-running the tail after a partial failure is safe.
set -euo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"   # repo root

FROM="${1:?usage: bash db/deploy/upgrade.sh <first-migration-number, e.g. 0048>}"
command -v docker >/dev/null || { echo "✗ docker not installed"; exit 1; }
docker exec locale-db pg_isready -U postgres -d locale >/dev/null || { echo "✗ locale-db not running"; exit 1; }

applied=0
for f in db/migrations/[0-9][0-9][0-9][0-9]_*.sql; do
  n=$(basename "$f" | cut -c1-4)
  if (( 10#$n < 10#$FROM )); then continue; fi
  printf 'apply %s\n' "$(basename "$f")"
  docker exec -i locale-db psql -v ON_ERROR_STOP=1 -q -U postgres -d locale < "$f"
  applied=$((applied + 1))
done

echo "── done — ${applied} migration(s) applied (from ${FROM}) ──"
echo "verify:  docker exec -i locale-db psql -U postgres -d locale -f - < db/deploy/verify.sql"
