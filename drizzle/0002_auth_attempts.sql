-- Track login and OTP-verify attempts for rate limiting.
CREATE TABLE IF NOT EXISTS auth_attempts (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  kind TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_attempts_identifier_idx
  ON auth_attempts (identifier, kind, created_at);
