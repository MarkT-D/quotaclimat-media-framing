#!/usr/bin/env python3
"""Import merged_articles_1705_v3.csv into the articles table.

v3 adds direct `outlet` and `published_at` columns for all 20 778 rows,
so no source_id parsing is needed.  For the ~2 100 English rows whose URL
matches a JSONL scraper record, `scraped_at` and richer LN tags are pulled
from the JSONL index.

Usage:
    python import_csv.py [--csv PATH] [--jsonl-dir DIR] [--dsn DSN] [--dry-run]

Env:
    DATABASE_URL  Postgres DSN (overrides --dsn default)

Defaults:
    --csv       backend/db/merged_articles_1705_v3.csv
    --jsonl-dir backend/scraper/output
    --dsn       postgresql://localhost/quota_climate
"""

import argparse
import csv
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

import psycopg2
import psycopg2.extras

# ---------------------------------------------------------------------------
# JSONL enrichment index (keyed by url)
# ---------------------------------------------------------------------------

def load_jsonl_index(jsonl_dir: Path) -> dict[str, dict]:
    index: dict[str, dict] = {}
    for path in sorted(jsonl_dir.glob("*.jsonl")):
        with path.open(encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                    url = rec.get("url", "").strip()
                    if url:
                        index[url] = rec
                except json.JSONDecodeError:
                    pass
    return index


def _clf(rec: dict, key: str) -> str | None:
    val = rec.get("classification", {}).get(key, "")
    return val.strip() or None


# ---------------------------------------------------------------------------
# Type converters
# ---------------------------------------------------------------------------

def _bool(val: str) -> bool | None:
    v = val.strip()
    if v == "True":  return True
    if v == "False": return False
    return None


def _real(val: str) -> float | None:
    v = val.strip()
    if v == "True":  return 1.0
    if v == "False": return None
    try:
        return float(v)
    except ValueError:
        return None


def _int(val: str) -> int | None:
    try:
        return int(val.strip())
    except ValueError:
        return None


def _text(val: str) -> str | None:
    v = val.strip()
    return v or None


def _ts(val: str) -> str | None:
    v = val.strip()
    return v or None


def _date(val: str) -> date | None:
    v = val.strip()
    try:
        return datetime.strptime(v, "%Y-%m-%d").date()
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Column mapping: CSV column → (db column, converter)
# ---------------------------------------------------------------------------
COLUMN_MAP: dict[str, tuple[str, object]] = {
    "source_id":              ("source_id",              _text),
    "title":                  ("title",                  _text),
    "body":                   ("body",                   _text),
    "language":               ("language",               _text),
    "word_count":             ("word_count",             _int),
    "url":                    ("url",                    _text),
    "query_source":           ("query_source",           _text),
    # v3 direct columns
    "outlet":                 ("outlet",                 _text),
    "published_at":           ("published_at",           _date),
    # angle columns (angles_health → angle_health rename)
    "angles_health":          ("angle_health",           _real),
    "angle_economics":        ("angle_economics",        _real),
    "angle_jobs":             ("angle_jobs",             _real),
    "angle_politics":         ("angle_politics",         _real),
    "angle_geopolitics":      ("angle_geopolitics",      _real),
    "angle_purchasing_power": ("angle_purchasing_power", _real),
    # timestamps
    "classified_at":          ("classified_at",          _ts),
    "ingested_at":            ("_ingested_at_csv",       _ts),  # handled separately
    # sector booleans (sector_resource → sector_resource_economy rename)
    "sector_agriculture":     ("sector_agriculture",     _bool),
    "sector_buildings":       ("sector_buildings",       _bool),
    "sector_ecosystem":       ("sector_ecosystem",       _bool),
    "sector_energy":          ("sector_energy",          _bool),
    "sector_industry":        ("sector_industry",        _bool),
    "sector_resource":        ("sector_resource_economy", _bool),
    "sector_transport":       ("sector_transport",       _bool),
    "sector_water":           ("sector_water",           _bool),
    # frame reals
    "frame_conflict":         ("frame_conflict",         _real),
    "frame_economic":         ("frame_economic",         _real),
    "frame_human_interest":   ("frame_human_interest",   _real),
    "frame_morality":         ("frame_morality",         _real),
    "frame_attribution":      ("frame_attribution",      _real),
    # LexisNexis metadata tags (renamed)
    "subject":                ("ln_subject",             _text),
    "industry":               ("ln_industry",            _text),
    "geographic":             ("ln_geographic",          _text),
}

INSERT_SQL = """
INSERT INTO articles (
    source_id, title, body, outlet, published_at, language,
    word_count, url, query_source,
    scraped_at, classified_at, ingested_at,
    angle_health, angle_economics, angle_jobs, angle_politics,
    angle_geopolitics, angle_purchasing_power,
    sector_agriculture, sector_buildings, sector_ecosystem,
    sector_energy, sector_industry, sector_resource_economy,
    sector_transport, sector_water,
    frame_conflict, frame_economic, frame_human_interest,
    frame_morality, frame_attribution,
    ln_subject, ln_industry, ln_geographic
) VALUES (
    %(source_id)s, %(title)s, %(body)s, %(outlet)s, %(published_at)s, %(language)s,
    %(word_count)s, %(url)s, %(query_source)s,
    %(scraped_at)s, %(classified_at)s, COALESCE(%(ingested_at)s::timestamptz, NOW()),
    %(angle_health)s, %(angle_economics)s, %(angle_jobs)s, %(angle_politics)s,
    %(angle_geopolitics)s, %(angle_purchasing_power)s,
    %(sector_agriculture)s, %(sector_buildings)s, %(sector_ecosystem)s,
    %(sector_energy)s, %(sector_industry)s, %(sector_resource_economy)s,
    %(sector_transport)s, %(sector_water)s,
    %(frame_conflict)s, %(frame_economic)s, %(frame_human_interest)s,
    %(frame_morality)s, %(frame_attribution)s,
    %(ln_subject)s, %(ln_industry)s, %(ln_geographic)s
)
ON CONFLICT (source_id) DO UPDATE SET
    source_id               = EXCLUDED.source_id,
    title                   = EXCLUDED.title,
    body                    = EXCLUDED.body,
    outlet                  = EXCLUDED.outlet,
    published_at            = EXCLUDED.published_at,
    language                = EXCLUDED.language,
    word_count              = EXCLUDED.word_count,
    query_source            = EXCLUDED.query_source,
    scraped_at              = EXCLUDED.scraped_at,
    classified_at           = EXCLUDED.classified_at,
    angle_health            = EXCLUDED.angle_health,
    angle_economics         = EXCLUDED.angle_economics,
    angle_jobs              = EXCLUDED.angle_jobs,
    angle_politics          = EXCLUDED.angle_politics,
    angle_geopolitics       = EXCLUDED.angle_geopolitics,
    angle_purchasing_power  = EXCLUDED.angle_purchasing_power,
    sector_agriculture      = EXCLUDED.sector_agriculture,
    sector_buildings        = EXCLUDED.sector_buildings,
    sector_ecosystem        = EXCLUDED.sector_ecosystem,
    sector_energy           = EXCLUDED.sector_energy,
    sector_industry         = EXCLUDED.sector_industry,
    sector_resource_economy = EXCLUDED.sector_resource_economy,
    sector_transport        = EXCLUDED.sector_transport,
    sector_water            = EXCLUDED.sector_water,
    frame_conflict          = EXCLUDED.frame_conflict,
    frame_economic          = EXCLUDED.frame_economic,
    frame_human_interest    = EXCLUDED.frame_human_interest,
    frame_morality          = EXCLUDED.frame_morality,
    frame_attribution       = EXCLUDED.frame_attribution,
    ln_subject              = EXCLUDED.ln_subject,
    ln_industry             = EXCLUDED.ln_industry,
    ln_geographic           = EXCLUDED.ln_geographic;
"""

BATCH_SIZE = 500


def build_row(raw: dict[str, str], jsonl_index: dict[str, dict]) -> dict | None:
    title = raw.get("title", "").strip()
    if not title:
        return None

    source_id = raw.get("source_id", "").strip()
    if not source_id:
        return None  # no dedup key

    csv_url = raw.get("url", "").strip()

    # JSONL enrichment — only for rows whose real URL matches a scraper record
    jrec = jsonl_index.get(csv_url) if csv_url else None
    scraped_at = jrec.get("scraped_at") if jrec else None

    row: dict = {"scraped_at": scraped_at, "ingested_at": None}

    for csv_col, (db_col, converter) in COLUMN_MAP.items():
        val = converter(raw.get(csv_col, ""))  # type: ignore[operator]
        if db_col == "_ingested_at_csv":
            row["ingested_at"] = val
        else:
            row[db_col] = val

    # Validate NOT NULL fields
    if not row.get("outlet") or not row.get("published_at"):
        return None

    # JSONL: fill language / LN tags when CSV fields are blank
    if jrec:
        if not row.get("language"):
            row["language"] = _clf(jrec, "Language")
        if not row.get("ln_subject"):
            row["ln_subject"] = _clf(jrec, "Subject")
        if not row.get("ln_industry"):
            row["ln_industry"] = _clf(jrec, "Industry")
        if not row.get("ln_geographic"):
            row["ln_geographic"] = _clf(jrec, "Geographic")

    return row


def _flush(conn: "psycopg2.connection", batch: list[dict]) -> int:
    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(cur, INSERT_SQL, batch, page_size=BATCH_SIZE)
    conn.commit()
    return len(batch)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--csv",       default="backend/db/merged_articles_1705_v5.csv")
    parser.add_argument("--jsonl-dir", default="backend/scraper/output")
    parser.add_argument("--dsn",       default=os.getenv("DATABASE_URL", "postgresql://localhost/quota_climate"))
    parser.add_argument("--dry-run",   action="store_true")
    args = parser.parse_args()

    csv_path  = Path(args.csv)
    jsonl_dir = Path(args.jsonl_dir)

    if not csv_path.exists():
        sys.exit(f"CSV not found: {csv_path}")

    print("Loading JSONL index…", end=" ", flush=True)
    jsonl_index = load_jsonl_index(jsonl_dir) if jsonl_dir.exists() else {}
    print(f"{len(jsonl_index):,} records")

    stats = {
        "total":            0,
        "enriched":         0,
        "inserted":         0,
        "skipped_no_title": 0,
        "skipped_invalid":  0,
        "errors":           0,
    }

    conn = None if args.dry_run else psycopg2.connect(args.dsn)
    try:
        batch: list[dict] = []

        with csv_path.open(encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            for raw in reader:
                stats["total"] += 1

                if not raw.get("title", "").strip():
                    stats["skipped_no_title"] += 1
                    continue

                row = build_row(raw, jsonl_index)
                if row is None:
                    stats["skipped_invalid"] += 1
                    continue

                if row.get("scraped_at"):
                    stats["enriched"] += 1

                batch.append(row)

                if len(batch) >= BATCH_SIZE and not args.dry_run:
                    try:
                        stats["inserted"] += _flush(conn, batch)
                    except Exception as exc:
                        conn.rollback()
                        print(f"\n[ERROR] batch flush: {exc}", file=sys.stderr)
                        stats["errors"] += len(batch)
                    batch.clear()

        if batch and not args.dry_run:
            try:
                stats["inserted"] += _flush(conn, batch)
            except Exception as exc:
                conn.rollback()
                print(f"\n[ERROR] final batch: {exc}", file=sys.stderr)
                stats["errors"] += len(batch)

        if args.dry_run:
            stats["inserted"] = len(batch)

    finally:
        if conn:
            conn.close()

    prefix = "DRY RUN — " if args.dry_run else ""
    print(f"\n{prefix}Import complete")
    print(f"  Rows read:                {stats['total']:,}")
    print(f"  Inserted / updated:       {stats['inserted']:,}")
    print(f"  Enriched via JSONL:       {stats['enriched']:,}  (scraped_at + LN tags)")
    print(f"  Skipped (no title):       {stats['skipped_no_title']:,}")
    print(f"  Skipped (missing outlet/date): {stats['skipped_invalid']:,}")
    print(f"  Batch errors:             {stats['errors']:,}")


if __name__ == "__main__":
    main()
