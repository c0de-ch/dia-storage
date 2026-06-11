-- Share an entire gallery (all of an owner's slides) read-only with another
-- registered user.
CREATE TABLE IF NOT EXISTS gallery_shares (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  shared_with_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT gallery_shares_unique UNIQUE (owner_user_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS gallery_shares_recipient_idx
  ON gallery_shares (shared_with_user_id);

CREATE INDEX IF NOT EXISTS gallery_shares_owner_idx
  ON gallery_shares (owner_user_id);
