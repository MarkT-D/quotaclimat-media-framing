-- Articles table
-- One row per article. Frame/angle columns are NULL until the classifier runs.

CREATE TABLE articles (
    id              SERIAL PRIMARY KEY,

    -- Core content
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    outlet          TEXT NOT NULL,
    published_at    DATE NOT NULL,
    language        TEXT,

    -- Metadata
    word_count      INTEGER,
    url             TEXT NOT NULL UNIQUE,
    query_source    TEXT,               -- scraper query that produced this row

    -- Sector classification
    sector          TEXT,               -- e.g. Energy, Transport, Agriculture …

    -- LexisNexis subject / geographic / industry tags (raw strings)
    ln_subject      TEXT,
    ln_geographic   TEXT,
    ln_industry     TEXT,

    -- Timestamps
    scraped_at      TIMESTAMPTZ,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Frame probabilities — Semetko & Valkenburg (2000), range 0–1
    frame_attribution       REAL,
    frame_human_interest    REAL,
    frame_conflict          REAL,
    frame_morality          REAL,
    frame_economic          REAL,

    -- Angle probabilities, range 0–1
    angle_health            REAL,
    angle_economics         REAL,
    angle_jobs              REAL,
    angle_politics          REAL,
    angle_geopolitics       REAL,
    angle_purchasing_power  REAL,

    classified_at   TIMESTAMPTZ
);

CREATE INDEX ON articles (published_at);
CREATE INDEX ON articles (outlet);
CREATE INDEX ON articles (language);
CREATE INDEX ON articles (query_source);
