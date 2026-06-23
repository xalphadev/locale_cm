# Locale iOS apps — build & release

Two Flutter **WebView-shell** apps that wrap the existing Next.js web apps:

| App | Dir | Bundle id | Web it loads |
|-----|-----|-----------|--------------|
| Locale (consumer) | `consumer/` | `com.localecm.consumer` | consumer web |
| Locale ร้านค้า (merchant) | `merchant/` | `com.localecm.merchant` | merchant portal |

The shared shell lives in `shell/` (path dependency).

## ⚠️ `BASE_URL` is required for release

Each app reads its web origin from `--dart-define=BASE_URL`. The **default is the local dev
server** (`http://localhost:3003` consumer, `http://localhost:3002/merchant` merchant) — handy on
the simulator, but a release build shipped without overriding it would point at localhost and fail
loudly on a device. **Always pass `BASE_URL` for any non-dev build.**

```bash
# dev on the booted simulator (defaults to localhost — fine)
cd consumer && flutter run

# release IPA (override BASE_URL to the deployed https origin)
cd consumer && flutter build ipa --release \
  --dart-define=BASE_URL=https://app.locale.example
cd merchant && flutter build ipa --release \
  --dart-define=BASE_URL=https://merchant.locale.example/merchant
```

Or use the helper: `./build_release_ios.sh consumer https://app.locale.example`

> The production domains above are placeholders — set the real https origins before shipping.

## Known follow-ups (from the shell review)
- **App icon & splash** — both still ship the default Flutter icon; generate branded icons
  (e.g. `flutter_launcher_icons`) before App Store submission.
- **File upload** — merchant photo upload uses the WKWebView native picker; verify on a
  **physical device** (camera input can't be exercised on the simulator).
- **OAuth (Google/LINE)** — when enabled in prod, route the auth hop through
  `ASWebAuthenticationSession` (shared cookie jar); an in-WebView → Safari bounce loses the
  `oauth_state`/session cookie. Dev has no creds, so the buttons are hidden today.
- **Universal Links / push** — not configured; needs a live https domain + AASA file.
