-- ============================================================================
-- Stable demo back-office users for the content-supply pipeline:
--   • a FIELD AGENT (proposes new places / edits)
--   • a PLATFORM ADMIN (reviews & approves — must differ from proposer, SoD)
-- Fixed v4 UUIDs so the web app can hard-reference them. Re-runnable.
-- ============================================================================
\set agent '00000000-0000-4000-8000-00000000a6e7'
\set admin '00000000-0000-4000-8000-00000000ad11'
SELECT id AS cid FROM cities WHERE code='CNX' \gset
SELECT id AS did FROM districts WHERE slug='nimman' \gset

INSERT INTO users(id, home_city_id) VALUES (:'agent', :'cid') ON CONFLICT DO NOTHING;
INSERT INTO users(id, home_city_id) VALUES (:'admin', :'cid') ON CONFLICT DO NOTHING;

INSERT INTO user_roles(user_id, role, scope_city_id) VALUES (:'agent','field_agent', :'cid')
  ON CONFLICT DO NOTHING;
INSERT INTO user_roles(user_id, role, scope_city_id) VALUES (:'admin','platform_admin', :'cid')
  ON CONFLICT DO NOTHING;

-- agent profile + territory (Nimman) for completeness
INSERT INTO agents(id, user_id, city_id, affiliation, status, kyc_status)
  VALUES ('00000000-0000-4000-8000-00000000a6e8', :'agent', :'cid', 'cmu', 'active', 'verified')
  ON CONFLICT DO NOTHING;

SELECT 'SUPPLY agent='||:'agent'||' admin='||:'admin' AS seeded;
