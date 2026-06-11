-- Share an album (collection) read-only with another registered user.
CREATE TABLE IF NOT EXISTS collection_shares (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  shared_by_user_id INTEGER REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT collection_shares_unique UNIQUE (collection_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS collection_shares_user_idx
  ON collection_shares (shared_with_user_id);

CREATE INDEX IF NOT EXISTS collection_shares_collection_idx
  ON collection_shares (collection_id);
