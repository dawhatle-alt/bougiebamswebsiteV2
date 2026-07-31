-- Tablescape Builder (AI-composed tablescape images)
--
-- Run this in the Supabase SQL editor BEFORE deploying the code that uses it:
-- the server SELECTs these product columns on every catalog query, so the
-- columns must exist first. drizzle-kit push does not run on deploy.

ALTER TABLE products ADD COLUMN IF NOT EXISTS tablescape_slot text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tablescape_image_path text;

CREATE TABLE IF NOT EXISTS tablescape_generations (
  id text PRIMARY KEY,
  visitor_id text NOT NULL,
  shopper_id text,
  selections jsonb NOT NULL,
  image_path text NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tablescape_generations_visitor_created_idx
  ON tablescape_generations (visitor_id, created_at);

-- Deny-all through Supabase's public REST API. The server connects as the table
-- owner over direct Postgres and is unaffected.
ALTER TABLE tablescape_generations ENABLE ROW LEVEL SECURITY;
