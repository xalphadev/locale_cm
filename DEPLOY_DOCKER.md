# Deploy — Locale (self-hosted, Docker Compose)

Single-server deploy: Postgres+PostGIS, MinIO (images), the two Next.js apps, the NestJS money-plane,
all behind Caddy (automatic HTTPS). No Supabase, no Vercel.

```
                          :443/:80   Caddy (auto-TLS)
  locale.xalpha.co.th ───────────────► consumer  :3003   (customer)
  locale-merchant.xalpha.co.th ──────► web :3002 → /merchant
  locale-platform.xalpha.co.th ──────► web :3002 (admin)        🔒 HTTP basic-auth
  locale-assets.xalpha.co.th ────────► minio :9000  (public-read images, bucket "media")
  ───────────── internal network (not published) ─────────────
   api :3001 (money_writer)  ·  postgres "locale" (TZ Asia/Bangkok)  ·  minio + console
```

DB roles (least-privilege, money_writer = sole ledger writer):
`money_writer` → api · `app_content` → web · `app_consumer` → consumer (see `db/deploy/grants_app_roles.sql`).

## 1. DNS (do this first — TLS needs it)
Point all four at the server:
```
locale.xalpha.co.th            A   45.150.128.153
locale-merchant.xalpha.co.th   A   45.150.128.153
locale-platform.xalpha.co.th   A   45.150.128.153
locale-assets.xalpha.co.th     A   45.150.128.153
```
(A wildcard `*.xalpha.co.th A 45.150.128.153` covers them too.)

## 2. Server prerequisites
Ubuntu/Debian — install Docker Engine + compose plugin, then a firewall:
```bash
curl -fsSL https://get.docker.com | sh
sudo apt-get install -y ufw
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw --force enable
```
Resources: ~3–4 GB RAM (6 containers). Keep DB/MinIO ports bound to 127.0.0.1 (the compose files already do).

## 3. Get the code + configure secrets
```bash
git clone https://github.com/xalphadev/locale_cm.git && cd locale_cm
cp .env.prod.example .env.prod && chmod 600 .env.prod
```
Fill every `CHANGE_ME` in `.env.prod`:
```bash
openssl rand -hex 32          # → POSTGRES_PASSWORD, *_PASSWORD, MERCHANT/CONSUMER_SESSION_SECRET, S3_*
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'YOUR_ADMIN_PASS'   # → CADDY_BASICAUTH_HASH
```
Keep each DB password identical in its `*_PASSWORD` var **and** in the matching `*_DATABASE_URL`.

## 4. Deploy
```bash
bash db/deploy/deploy.sh
```
This: starts Postgres + MinIO (+ creates the public `media` bucket) → applies all migrations (real
PostGIS) → provisions `money_writer` + `app_content` + `app_consumer` with passwords → sets the
fail-closed COGS caps → seeds 20 demo shops with cover images uploaded to MinIO (fresh DB only) →
builds and starts api + web + consumer + Caddy. Re-running is safe (idempotent; seed auto-skips).

## 5. Verify
```bash
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml ps
docker exec -i locale-db psql -U postgres -d locale -f - < db/deploy/verify.sql   # solvency=pass, objects present
```
Then open `https://locale.xalpha.co.th`. First request per domain may take a few seconds while Caddy
issues the certificate. Admin (`locale-platform`) prompts for the basic-auth user/password.

## 6. Backups (recommended)
```bash
# nightly Postgres dump (cron)
0 3 * * *  docker exec locale-db pg_dump -U postgres locale | gzip > /var/backups/locale-$(date +\%F).sql.gz
# MinIO mirror (run from a box with mc configured) — or snapshot the `miniodata` volume
```

## 7. Redeploy after a code change
```bash
git pull
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
New migrations — apply only the NEW ones with the upgrade helper (deploy.sh intentionally skips
migrations when the schema already exists, and re-looping ALL files fails on the early
non-idempotent `CREATE TYPE` migrations):
```bash
bash db/deploy/upgrade.sh 0048     # first NEW migration number .. latest, in order
```

## Local dev parity
`docker compose up -d` runs the SAME Postgres + MinIO locally (trust auth, auto-migrate via the dev
override), with images in the same `media` bucket / key layout. Apps run on the host for HMR:
```bash
docker compose up -d
cd apps/web && DATABASE_URL=postgres://postgres@127.0.0.1:54400/locale node ../../db/test/seed-shops.mjs
node ../../db/deploy/seed-media.mjs        # MinIO-hosted cover images
cd apps/web && npm run dev    # :3002    ·    cd apps/consumer && npm run dev    # :3003
```
Image storage code (`apps/web/lib/storage.ts`) is identical dev↔prod; only `ASSET_PUBLIC_BASE` +
`S3_ENDPOINT` differ (env). To smoke-test the full prod stack locally, run the prod compose with
fake domains in `/etc/hosts`.

## Notes / not-yet
- `apps/api` is deployed (quests, admin moderation, counter-redeem need it); real escrow/Coins stay
  dormant until a PSP + legal sign-offs land (see `DEPLOY.md` §5).
- Platform admin has no app-level login yet — it is gated only by Caddy basic-auth. Build a real admin
  login before widening access.
- Anonymous (logged-out) visitors can browse but cannot write (no shared demo persona in production).
