#!/usr/bin/env bash
# Release-build a Locale iOS app with a REQUIRED production BASE_URL.
# Usage: ./build_release_ios.sh <consumer|merchant> <https-base-url>
set -euo pipefail

APP="${1:-}"
BASE_URL="${2:-}"

if [[ "$APP" != "consumer" && "$APP" != "merchant" ]]; then
  echo "error: first arg must be 'consumer' or 'merchant'" >&2; exit 1
fi
if [[ -z "$BASE_URL" || "$BASE_URL" != https://* ]]; then
  echo "error: second arg must be a production https BASE_URL (refusing to build at localhost)" >&2
  exit 1
fi

cd "$(dirname "$0")/$APP"
echo "Building $APP (release) → $BASE_URL"
flutter build ipa --release --dart-define=BASE_URL="$BASE_URL"
