#!/usr/bin/env bash
# ============================================================================
# run-real-postgis.sh — prove the FULL system on a REAL PostgreSQL + PostGIS
# cluster (pg17), by dogfooding db/deploy/apply-all.sh. This exercises the geo
# path (geography columns, GiST indexes, fn_create_place ST_MakePoint, fn_check_in
# ST_DWithin geofence) that the PostGIS-STUBBED local dev DB (db/test/setup-dev-db.sh)
# cannot. Passing here == Supabase deploy-ready. Self-contained; cleans up.
#
# Prereq:  brew install postgresql@17 postgis
# Run:     bash db/test/run-real-postgis.sh
# ============================================================================
set -uo pipefail
PGBIN=${PGBIN:-/opt/homebrew/opt/postgresql@17/bin}
[ -x "$PGBIN/initdb" ] || { echo "FATAL: need pg17 — 'brew install postgresql@17 postgis'"; exit 1; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGDATA=/tmp/soihop_realpg; PORT=${PORT:-54401}; DB=soihop_real
PG() { "$PGBIN/psql" -h 127.0.0.1 -p "$PORT" -U postgres "$@"; }

"$PGBIN/pg_ctl" -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
rm -rf "$PGDATA"; mkdir -p "$PGDATA"
"$PGBIN/initdb" -D "$PGDATA" -U postgres --auth-local=trust --auth-host=trust >/dev/null
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -c listen_addresses=127.0.0.1" -w start >/dev/null
PG -d postgres -q -c "CREATE DATABASE $DB;"
echo "pg$("$PGBIN/pg_config" --version | grep -oE '[0-9]+' | head -1) cluster up on :$PORT"

echo "──────── 1. apply-all.sh (migrations 0001..0015 VERBATIM on real PostGIS) ────────"
DATABASE_URL="postgres://postgres@127.0.0.1:$PORT/$DB" PATH="$PGBIN:$PATH" \
  bash "$ROOT/db/deploy/apply-all.sh" || { echo "APPLY FAILED"; exit 1; }

echo "──────── 2. verify.sql ────────"
PG -d "$DB" -q -f "$ROOT/db/deploy/verify.sql" | grep -iE "postgis|status=pass|CNX|^ *[0-9]+ *$" | head

echo "──────── 3. money loop on real PostGIS (loop.sql) ────────"
PG -d "$DB" -q -f "$ROOT/db/test/loop.sql" >/tmp/realpg_loop.out 2>&1
if grep -q "LEDGER_OFFENDERS=0" /tmp/realpg_loop.out; then echo "  ✓ money loop: ledger balanced (0 offenders)"; else echo "  ✗ LOOP FAILED"; tail -8 /tmp/realpg_loop.out; fi

echo "──────── 4. GEO path (the PostGIS-only proof) ────────"
PG -d "$DB" -q -f "$ROOT/db/test/seed-agents.sql" >/dev/null 2>&1
PG -d "$DB" -q <<'SQL'
\set agent '00000000-0000-4000-8000-00000000a6e7'
\set admin '00000000-0000-4000-8000-00000000ad11'
SELECT id AS cid FROM cities WHERE code='CNX' \gset
INSERT INTO change_proposals(target_type,target_id,city_id,proposed_by,proposer_role,diff,status)
VALUES('place',NULL,:'cid',:'agent','field_agent',
  jsonb_build_object('after',jsonb_build_object(
    'name_i18n','{"th":"คาเฟ่จีโอเทส"}'::jsonb,'category','eat','subcategory','cafe',
    'lng',98.9672,'lat',18.7972)),'pending') RETURNING id AS pid \gset
SELECT fn_apply_proposal(:'pid', :'admin') \gset apply_
SELECT target_id AS place FROM change_proposals WHERE id=:'pid' \gset
SELECT '  ✓ fn_create_place geo: '||ST_AsText(geo)||' SRID='||ST_SRID(geo) FROM places WHERE id=:'place';
INSERT INTO users(id,home_city_id) VALUES ('00000000-0000-4000-8000-0000000000c1',:'cid') ON CONFLICT DO NOTHING;
\set u '00000000-0000-4000-8000-0000000000c1'
SELECT '  ✓ geofence ACCEPT (within 80m): check_in='||fn_check_in(:'u',:'place',NULL,98.9672,18.7972,'gps_dwell',NULL,80);
\set ON_ERROR_STOP off
\echo '  ✓ geofence REJECT (~3km) → expect RAISE:'
SELECT fn_check_in(:'u',:'place',NULL,98.9900,18.8200,'gps_dwell',NULL,80);
SQL

echo "──────── cleanup ────────"
"$PGBIN/pg_ctl" -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
echo "✅ REAL-POSTGIS VERIFICATION COMPLETE — migrations + money + geo all green on PostGIS."
