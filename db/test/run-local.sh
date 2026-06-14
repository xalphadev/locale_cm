#!/usr/bin/env bash
# Local migration + ledger-invariant smoke test in a throwaway Postgres cluster.
# PostGIS is stubbed (geography->text, GIST indexes skipped, extensions commented) so the
# schema + the money keystone can be validated WITHOUT PostGIS. On Supabase the real
# migrations run unchanged (PostGIS present). Run: bash db/test/run-local.sh
set -uo pipefail
PGBIN=/opt/homebrew/opt/postgresql@16/bin
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MIG="$ROOT/db/migrations"
TMP="$(mktemp -d)"; PGDATA="$TMP/data"; SOCK="$TMP/sock"; PORT=54399; DB=soihop_test
mkdir -p "$PGDATA" "$SOCK"
cleanup(){ "$PGBIN/pg_ctl" -D "$PGDATA" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"; }
trap cleanup EXIT

echo "== initdb =="; "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth-local=trust --auth-host=trust >/dev/null
echo "== start (port $PORT) =="
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null
PSQL="$PGBIN/psql -h $SOCK -p $PORT -U postgres"
$PSQL -d postgres -c "CREATE DATABASE $DB;" >/dev/null

# --- build PostGIS-stubbed copies (local only) ---
STUB="$TMP/mig"; mkdir -p "$STUB"
sed -e 's/CREATE EXTENSION IF NOT EXISTS postgis;/-- (stub) postgis skipped for local test/' \
    -e 's/CREATE EXTENSION IF NOT EXISTS pgcrypto;/-- (stub) pgcrypto skipped (gen_random_uuid is core PG16)/' \
    "$MIG/0001_extensions_and_enums.sql" > "$STUB/0001.sql"
sed -e 's/geography([A-Z]*,4326)/text/g' \
    -e '/USING GIST/ s/^/-- (stub) /' \
    "$MIG/0002_tables.sql" > "$STUB/0002.sql"
cp "$MIG/0003_invariants_and_roles.sql" "$STUB/0003.sql"
cp "$MIG/0004_seed.sql" "$STUB/0004.sql"
cp "$MIG/0005_money_functions.sql" "$STUB/0005.sql"

echo "== apply migrations =="
APPLY_OK=1
for f in 0001 0002 0003 0004 0005; do
  if $PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$STUB/$f.sql" 2>"$TMP/$f.err"; then
    echo "  [ok] $f"
  else
    echo "  [FAIL] $f"; sed 's/^/      /' "$TMP/$f.err"; APPLY_OK=0; break
  fi
done
[ "$APPLY_OK" = 1 ] || { echo "MIGRATIONS FAILED"; exit 1; }

TBLS=$($PSQL -d $DB -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "  tables created: $TBLS"

echo "== ledger smoke test =="
OUT="$($PSQL -d $DB -f "$ROOT/db/test/smoke.sql" 2>&1)"
echo "$OUT" | sed 's/^/  | /'

echo "== assertions =="
pass=0; fail=0
chk(){ if echo "$OUT" | grep -q "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }
chk "T1 balanced txn commits"                 "T1 committed"
chk "T2 sum-to-zero rejected (A.8.1)"          "A.8.1 violated"
chk "T3 clearing-flat rejected (A.8.1b)"       "A.8.1b violated"
chk "T4 append-only UPDATE blocked"            "append-only"
chk "T5 amount_minor>0 CHECK"                  "amount_minor"
if echo "$OUT" | grep -qE "persisted_entries[^0-9]*\n?[^0-9]*2|^ *2$"; then :; fi
PE="$($PSQL -d $DB -tA -c 'SELECT count(*) FROM ledger_entries;')"
if [ "$PE" = "2" ]; then echo "  PASS: only T1 persisted (2 entries)"; pass=$((pass+1)); else echo "  FAIL: persisted=$PE (want 2)"; fail=$((fail+1)); fi

echo "== full money-loop test (prefund→settle→fund_quest→grant→redeem) =="
LOUT="$($PSQL -d $DB -f "$ROOT/db/test/loop.sql" 2>&1)"
echo "$LOUT" | sed 's/^/  | /'
echo "== loop assertions =="
lchk(){ if echo "$LOUT" | grep -q "$2"; then echo "  PASS: $1"; pass=$((pass+1)); else echo "  FAIL: $1"; fail=$((fail+1)); fi; }
lchk "grant fail-closed when COGS caps unset"  "COGS caps unset"
lchk "mint balances liab=back=user=6000"       "AFTER_GRANT liab=6000 back=6000 user=6000"
lchk "anti-self-redemption blocked"            "anti-self-redemption"
lchk "final solvency + 10% take split"         "AFTER_REDEEM liab=0 back=0 user=0 rev=600 payable=5400"
lchk "ledger integrity (0 offenders)"          "LEDGER_OFFENDERS=0"

echo ""; echo "RESULT: $pass passed, $fail failed (tables=$TBLS)"
[ "$fail" = 0 ] || exit 1
