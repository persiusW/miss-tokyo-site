-- Categories: enable pre-order at category level and set estimated weeks
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS preorder_enabled        boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preorder_estimated_weeks smallint NOT NULL DEFAULT 0;
