#!/usr/bin/env bash
# Wipe the running localhost dev DB and reload REAL Chiang Mai demo data.
# Targets the persistent dev Postgres started by setup-dev-db.sh (port 54400).
# Usage: db/test/reseed-real.sh
set -euo pipefail
PGBIN=/opt/homebrew/opt/postgresql@16/bin
PORT=54400; DB=locale
DIR="$(cd "$(dirname "$0")" && pwd)"
"$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -f "$DIR/seed-real-cm.sql"

# Merchant-portal logins (scrypt hashing needs Node) — wires real places to merchant accounts.
ROOT="$(cd "$DIR/../.." && pwd)"
( cd "$ROOT/apps/web" && DATABASE_URL="postgres://postgres@127.0.0.1:$PORT/$DB" node "$DIR/seed-merchant-logins.mjs" )
