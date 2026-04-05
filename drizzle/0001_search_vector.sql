-- Install unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add tsvector generated column to slides table
ALTER TABLE slides
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(location, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(notes, ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(original_filename, ''))), 'D')
  ) STORED;

-- Create GIN index on the search_vector column
CREATE INDEX IF NOT EXISTS slides_search_vector_idx ON slides USING GIN (search_vector);

-- Trigger function to auto-update search_vector on INSERT/UPDATE
-- (kept as fallback for databases that do not support GENERATED ALWAYS AS)
CREATE OR REPLACE FUNCTION slides_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.location, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.notes, ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW.original_filename, ''))), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (will be silently ignored if the column is GENERATED ALWAYS)
DROP TRIGGER IF EXISTS slides_search_vector_trigger ON slides;
CREATE TRIGGER slides_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, location, notes, original_filename
  ON slides
  FOR EACH ROW
  EXECUTE FUNCTION slides_search_vector_update();
