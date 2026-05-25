-- Migration: 008 - Add extension prompt metadata

ALTER TABLE extensions
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS instructions TEXT;
