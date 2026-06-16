#!/usr/bin/env bash
# deploy.sh — bring up the full Locale stack on a Docker host (run from the repo root, on the server).
#
#   cp .env.prod.example .env.prod   # then fill every CHANGE_ME (chmod 600 .env.prod)
#   bash db/deploy/deploy.sh
#
# Idempotent: migrations are CREATE-OR-REPLACE / IF-NOT-EXISTS, role grants re-apply cleanly, and the
# seed is skipped if the DB already has shops. All SQL runs via the postgis container's own psql, and
# the seed runs in a one-off node container — so the host needs only Docker + the compose plugin.
set -euo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"   # repo root

[ -f .env.prod ] || { echo "✗ .env.prod missing — cp .env.prod.example .env.prod and fill it in"; exit 1; }
command -v docker >/dev/null || { echo "✗ docker not installed"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "✗ docker compose plugin missing"; exit 1; }

# Load .env.prod as LITERAL key=value (do NOT `source` it — values like the bcrypt basic-auth hash
# contain `$...` which the shell would try to expand, breaking under `set -u`).
while IFS='=' read -r k v; do
  case "$k" in ''|'#'*) continue ;; esac
  export "$k=$v"
done < .env.prod
: "${POSTGRES_PASSWORD:?}" "${MONEY_WRITER_PASSWORD:?}" "${APP_CONTENT_PASSWORD:?}" "${APP_CONSUMER_PASSWORD:?}"

DC="docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml"
psql_c() { docker exec -i locale-db psql -v ON_ERROR_STOP=1 -U postgres -d locale "$@"; }

echo "── 1/8  data plane (postgres + minio + bucket) ──"
$DC up -d db minio createbuckets

echo "── 2/8  wait for postgres ──"
for i in $(seq 1 30); do docker exec locale-db pg_isready -U postgres -d locale >/dev/null 2>&1 && break; sleep 2; done
docker exec locale-db pg_isready -U postgres -d locale

echo "── 3/8  apply migrations (real PostGIS, verbatim) ──"
for f in db/migrations/0*.sql; do printf '   %s\n' "$(basename "$f")"; psql_c < "$f"; done

echo "── 4/8  provision money_writer LOGIN (the money-plane api) ──"
psql_c -c "ALTER ROLE money_writer WITH LOGIN PASSWORD '${MONEY_WRITER_PASSWORD}';"

echo "── 5/8  app roles (app_consumer / app_content) + grants ──"
psql_c < db/deploy/grants_app_roles.sql
psql_c -c "ALTER ROLE app_consumer WITH LOGIN PASSWORD '${APP_CONSUMER_PASSWORD}';"
psql_c -c "ALTER ROLE app_content  WITH LOGIN PASSWORD '${APP_CONTENT_PASSWORD}';"

echo "── 6/8  COGS caps (fail-closed: rewards cannot mint until set) ──"
psql_c -c "UPDATE platform_config SET value='${REWARD_PER_REDEMPTION_CAP_THB:-100}'    WHERE key='REWARD_PER_REDEMPTION_CAP_THB';"
psql_c -c "UPDATE platform_config SET value='${MERCHANT_MONTHLY_COGS_CAP_THB:-100000}' WHERE key='MERCHANT_MONTHLY_COGS_CAP_THB';"

echo "── 7/8  seed (only on a fresh DB) ──"
SHOPS=$(psql_c -tA -c "SELECT count(*) FROM places WHERE brand_id IS NOT NULL;" | tr -d '[:space:]')
if [ "${SHOPS:-0}" = "0" ]; then
  $DC --profile tools run --rm seed
else
  echo "   ${SHOPS} shops already present — skipping seed (use 'docker compose ... run --rm seed' to force)"
fi

echo "── 8/8  build + start apps + caddy ──"
$DC up -d --build api web consumer caddy

echo
echo "✓ deployed. Verify:"
echo "   $DC ps"
echo "   docker exec -i locale-db psql -U postgres -d locale -f - < db/deploy/verify.sql   # solvency/objects"
echo "   https://${CONSUMER_DOMAIN}  ·  https://${MERCHANT_DOMAIN}/merchant  ·  https://${PLATFORM_DOMAIN} (basic-auth)"
echo "   (TLS certs issue automatically once DNS resolves to this host; first request may take a few seconds.)"
