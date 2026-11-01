CREATE TABLE IF NOT EXISTS m_book_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  name_key text GENERATED ALWAYS AS (lower(name)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT m_book_category_name_key_unique UNIQUE (name_key)
);

CREATE TABLE IF NOT EXISTS tr_book_category (
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  book_category_id uuid NOT NULL REFERENCES m_book_category(id) ON DELETE RESTRICT,
  PRIMARY KEY (book_id, book_category_id)
);
CREATE INDEX IF NOT EXISTS tr_book_category_category_idx ON tr_book_category(book_category_id);

-- Preserve legacy category text and backfill each comma-separated label once.
INSERT INTO m_book_category(name)
SELECT DISTINCT btrim(label)
FROM books CROSS JOIN LATERAL regexp_split_to_table(category, ',') AS label
WHERE btrim(label) <> ''
ON CONFLICT (name_key) DO NOTHING;

INSERT INTO tr_book_category(book_id, book_category_id)
SELECT b.id, c.id
FROM books b
CROSS JOIN LATERAL regexp_split_to_table(b.category, ',') AS label
JOIN m_book_category c ON c.name_key = lower(btrim(label))
WHERE btrim(label) <> ''
ON CONFLICT DO NOTHING;
