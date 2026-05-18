-- Articles table
-- One row per article. Frame/angle columns are NULL until the classifier runs.

CREATE TABLE articles (
    id              SERIAL PRIMARY KEY,
    source_id       TEXT UNIQUE,        -- original ID from the source (LexisNexis URN, French DB id, …)

    -- Core content
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    outlet          TEXT NOT NULL,
    published_at    DATE NOT NULL,
    language        TEXT,
    country         TEXT,               -- ISO 3166-1 alpha-2 (FR, GB, NG, …); populated by enrich_country.py

    -- Metadata
    word_count      INTEGER,
    url             TEXT UNIQUE,
    query_source    TEXT,               -- scraper query that produced this row

    -- Sector classification (one row can belong to multiple sectors)
    sector_transport        BOOLEAN,
    sector_buildings        BOOLEAN,
    sector_energy           BOOLEAN,
    sector_industry         BOOLEAN,
    sector_agriculture      BOOLEAN,
    sector_water            BOOLEAN,
    sector_ecosystem        BOOLEAN,
    sector_resource_economy BOOLEAN,

    -- Stage (French-specific, article can cover multiple stages)
    stage_general_concepts  BOOLEAN,
    stage_causes            BOOLEAN,
    stage_consequences      BOOLEAN,
    stage_solutions         BOOLEAN,

    -- Crisis domain
    domain_climate          BOOLEAN,
    domain_biodiversity     BOOLEAN,
    domain_resources        BOOLEAN,

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
CREATE INDEX ON articles (country);
CREATE INDEX ON articles (query_source);
