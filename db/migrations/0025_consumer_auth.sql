-- 0025_consumer_auth.sql — REAL consumer auth: email/password + OAuth (Google / LINE).
--
-- The consumer app shipped with a hardcoded DEMO_USER (lib/db demoUserId). This adds the identity
-- stores so a customer can sign up / log in for real and own their points/wallet:
--   user_credentials — email + scrypt password_hash (the money-plane `users` table has no password
--     by design — auth was meant to be external; this is the app's own email auth, like
--     merchant_accounts 0019).
--   user_identities  — links an OAuth provider login (auth_provider: line|google|apple|wechat) +
--     its provider_user_id (the OAuth 'sub') to a users row. A user may have several.
-- users.id stays the canonical app user id (self-generated uuid here, not Supabase auth.uid()).
--
-- NOTE (deploy): the consumer prod role is read-only (soihop_readonly); creating users at signup
-- needs a writer connection — either grant these to the consumer's role or route signup through the
-- money-plane API. In dev the app connects as postgres so it just works.

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,                       -- scrypt: "scrypt:<saltHex>:<hashHex>"
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_identities (
  provider         auth_provider NOT NULL,           -- line | google | apple | wechat
  provider_user_id text NOT NULL,                    -- the provider's stable user id ('sub')
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email            text,
  display_name     text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_identities_user  ON user_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_email ON user_identities(email) WHERE email IS NOT NULL;

-- grants: the consumer app (writer role) needs to create users at signup
GRANT INSERT, SELECT, UPDATE ON users, profiles TO money_writer;
GRANT INSERT, SELECT ON user_credentials, user_identities TO money_writer;
