#!/usr/bin/env bash
# Spin a PERSISTENT local Postgres (stays up), apply the PostGIS-stubbed migrations, and
# populate demo data from the verified test flows. Prints DATABASE_URL for the apps.
# Local-dev only (PostGIS stubbed; real DB = Supabase). Re-runnable. Stop with: db/test/stop-dev-db.sh
set -uo pipefail
PGBIN=/opt/homebrew/opt/postgresql@16/bin
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; MIG="$ROOT/db/migrations"
PGDATA=/tmp/soihop_devdb; PORT=54400; DB=soihop
"$PGBIN/pg_ctl" -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
rm -rf "$PGDATA"; mkdir -p "$PGDATA"
"$PGBIN/initdb" -D "$PGDATA" -U postgres --auth-local=trust --auth-host=trust >/dev/null
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -c listen_addresses=127.0.0.1" -w start >/dev/null
PSQL="$PGBIN/psql -h 127.0.0.1 -p $PORT -U postgres"
$PSQL -d postgres -c "CREATE DATABASE $DB;" >/dev/null

STUB=/tmp/soihop_mig; rm -rf "$STUB"; mkdir -p "$STUB"
sed -e 's/CREATE EXTENSION IF NOT EXISTS postgis;/-- postgis stub/' \
    -e 's/CREATE EXTENSION IF NOT EXISTS pgcrypto;/-- pgcrypto stub/' \
    "$MIG/0001_extensions_and_enums.sql" > "$STUB/0001.sql"
sed -e 's/geography([A-Z]*,4326)/text/g' -e '/USING GIST/ s/^/-- /' "$MIG/0002_tables.sql" > "$STUB/0002.sql"
( printf 'SET check_function_bodies = off;\n'; cat "$MIG/0006_supply_and_earn.sql" ) > "$STUB/0006.sql"
# 0013 has no compile-time PostGIS dep (geo built via format() strings) → copy as-is
for n in 0003 0004 0005 0007 0008 0009 0010 0011 0013; do cp "$MIG/${n}"*.sql "$STUB/$n.sql"; done

for n in 0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0013; do
  $PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$STUB/$n.sql" || { echo "APPLY FAIL $n"; exit 1; }
done
echo "tables: $($PSQL -d $DB -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")"

# demo data from the verified flows
for t in loop supply lifecycle seed-interactive seed-agents; do $PSQL -d $DB -q -f "$ROOT/db/test/$t.sql" >/dev/null 2>&1; done
$PSQL -d $DB -q -c "SELECT fn_reconcile_solvency((SELECT id FROM cities WHERE code='CNX'));" >/dev/null 2>&1
$PSQL -d $DB -q -c "SELECT fn_subscribe((SELECT id FROM merchants LIMIT 1),'growth','annual',1284000,'demo-sub');" >/dev/null 2>&1
echo "data: places=$($PSQL -d $DB -tA -c 'SELECT count(*) FROM places') merchants=$($PSQL -d $DB -tA -c 'SELECT count(*) FROM merchants') redemptions=$($PSQL -d $DB -tA -c 'SELECT count(*) FROM redemptions') recon=$($PSQL -d $DB -tA -c 'SELECT count(*) FROM reconciliation_runs')"
echo "DATABASE_URL=postgres://postgres@127.0.0.1:$PORT/$DB"
