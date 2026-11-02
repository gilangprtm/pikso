ALTER TABLE books
  ADD COLUMN IF NOT EXISTS access_code_hash text,
  ADD COLUMN IF NOT EXISTS access_version uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS books_access_version_idx ON books(id, access_version);
