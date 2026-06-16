# Consumer auth setup — Google & LINE login

Email/password login works out of the box. Google and LINE buttons appear **only after** you set
their credentials in `apps/consumer/.env` and restart the app. Here's how to get them.

After editing `.env`, **restart the consumer dev server** (`npm run dev`) — env is read at boot.

---

## 0. Session secret (already generated)

`CONSUMER_SESSION_SECRET` was auto-generated into `.env`. For production set your own:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`CONSUMER_BASE` is the public origin used to build the OAuth redirect URI (e.g.
`https://app.locale.com`). In dev it defaults to the request origin.

---

## 1. Google

1. Google Cloud Console → **APIs & Services → Credentials** → **Create credentials → OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** — add (must match exactly):
   - dev:  `http://127.0.0.1:3003/auth/google/callback`
   - prod: `https://<your-domain>/auth/google/callback`
4. (First time) configure the **OAuth consent screen** — scopes `openid`, `email`, `profile`.
5. Copy the **Client ID** and **Client secret** into `.env`:
   ```
   GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxx
   ```

---

## 2. LINE

1. [LINE Developers Console](https://developers.line.biz/) → create a **Provider** → create a
   **LINE Login** channel.
2. In the channel → **LINE Login** tab:
   - **Callback URL** — add:
     - dev:  `http://127.0.0.1:3003/auth/line/callback`
     - prod: `https://<your-domain>/auth/line/callback`
   - enable the **email** permission (requires submitting the email-address consent form).
3. **Basic settings** tab → copy **Channel ID** and **Channel secret** into `.env`:
   ```
   LINE_CHANNEL_ID=1234567890
   LINE_CHANNEL_SECRET=xxxx
   ```

---

## 3. Production notes

- The consumer app's prod DB role is read-only (`app_readonly`). Signup creates rows in
  `users / profiles / user_credentials / user_identities` — grant that role INSERT on those
  tables, or route signup through the money-plane API.
- `id_token` is decoded after the server-side code exchange (TLS + our client secret), not
  JWKS-signature-verified — fine for MVP, add JWKS verification before scale.
- Set `secure` cookies (already automatic when `NODE_ENV=production`) and serve over HTTPS.
