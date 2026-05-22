-- Step 1: add angle columns to an existing DB (safe to run on a fresh schema too).
ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS angle_health            REAL,
  ADD COLUMN IF NOT EXISTS angle_economics         REAL,
  ADD COLUMN IF NOT EXISTS angle_jobs              REAL,
  ADD COLUMN IF NOT EXISTS angle_politics          REAL,
  ADD COLUMN IF NOT EXISTS angle_geopolitics       REAL,
  ADD COLUMN IF NOT EXISTS angle_purchasing_power  REAL;

-- Step 2: randomly assign one angle per article that has no angle classification yet.
-- Uses a subquery so random() is evaluated once per row, guaranteeing exactly
-- one angle column gets 1.0 and the rest get 0.0.

UPDATE articles
SET
  angle_health           = (rng.r = 0)::int::real,
  angle_economics        = (rng.r = 1)::int::real,
  angle_jobs             = (rng.r = 2)::int::real,
  angle_politics         = (rng.r = 3)::int::real,
  angle_geopolitics      = (rng.r = 4)::int::real,
  angle_purchasing_power = (rng.r = 5)::int::real
FROM (
  SELECT id, floor(random() * 6)::int AS r
  FROM articles
  WHERE angle_health IS NULL
) AS rng
WHERE articles.id = rng.id;

-- Confirm
SELECT
  COUNT(*) FILTER (WHERE angle_health           = 1) AS health,
  COUNT(*) FILTER (WHERE angle_economics        = 1) AS economics,
  COUNT(*) FILTER (WHERE angle_jobs             = 1) AS jobs,
  COUNT(*) FILTER (WHERE angle_politics         = 1) AS politics,
  COUNT(*) FILTER (WHERE angle_geopolitics      = 1) AS geopolitics,
  COUNT(*) FILTER (WHERE angle_purchasing_power = 1) AS purchasing_power,
  COUNT(*) FILTER (WHERE angle_health IS NULL)        AS still_null
FROM articles;
