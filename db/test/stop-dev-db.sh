#!/usr/bin/env bash
# Stop the persistent local dev Postgres started by setup-dev-db.sh.
PGBIN=/opt/homebrew/opt/postgresql@16/bin
"$PGBIN/pg_ctl" -D /tmp/locale_devdb -m fast stop 2>/dev/null && echo "dev db stopped" || echo "dev db not running"
