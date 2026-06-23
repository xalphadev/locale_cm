-- 0046_place_socials.sql — extra contact channels beyond phone/line_id/website. A place's customers may reach
-- it on Facebook / Instagram / TikTok / WhatsApp etc. Store as a flexible jsonb map {facebook, instagram,
-- tiktok, whatsapp, …} (handle or URL, as the owner typed) so new channels need no migration. Display-only,
-- no money/PII beyond what the owner publishes as contact.
ALTER TABLE places ADD COLUMN IF NOT EXISTS socials jsonb;
