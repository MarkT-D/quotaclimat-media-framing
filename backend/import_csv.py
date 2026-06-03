"""
Import merged_articles_final_v1.csv into the articles table.

Wipes existing data, then inserts all rows with the correct column
mapping:  model_* → frame/angle probabilities,  *_attention_idx →
explanation JSON,  renamed stages/sectors/domains handled.

Usage:
    python backend/import_csv.py [--csv PATH] [--db URL] [--dry-run]
"""

import argparse
import csv
import json
import os
import re
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras
from dateutil import parser as dateutil_parser
from dotenv import load_dotenv

load_dotenv()

DEFAULT_CSV = Path(__file__).parent.parent / "merged_articles_final_v1.csv"
DEFAULT_DB = os.getenv("DATABASE_URL", "postgresql://quota:changeme@localhost:5432/quota_climate")


# ---------------------------------------------------------------------------
# Parsers
# ---------------------------------------------------------------------------

def parse_bool(v: str):
    if v == "True":  return True
    if v == "False": return False
    return None

def parse_float(v: str):
    v = v.strip()
    return float(v) if v else None

def parse_int(v: str):
    v = v.strip()
    return int(float(v)) if v else None

def parse_text(v: str):
    v = v.strip()
    return v or None

# Month name translations → English so dateutil can parse them
_MONTH_MAP = {
    # German
    "januar": "january", "februar": "february", "märz": "march", "maerz": "march",
    "april": "april", "mai": "may", "juni": "june", "juli": "july",
    "august": "august", "september": "september", "oktober": "october",
    "november": "november", "dezember": "december",
    # Dutch
    "januari": "january", "februari": "february", "maart": "march",
    "mei": "may", "juni": "june", "juli": "july", "augustus": "august",
    "oktober": "october",
    # French
    "janvier": "january", "février": "february", "fevrier": "february",
    "mars": "march", "avril": "april", "juin": "june", "juillet": "july",
    "août": "august", "aout": "august", "septembre": "september",
    "octobre": "october", "décembre": "december", "decembre": "december",
    # Day names to strip (German/Dutch/French)
    "montag": "", "dienstag": "", "mittwoch": "", "donnerstag": "", "freitag": "",
    "samstag": "", "sonntag": "",
    "maandag": "", "dinsdag": "", "woensdag": "", "donderdag": "", "vrijdag": "",
    "zaterdag": "", "zondag": "",
    "lundi": "", "mardi": "", "mercredi": "", "jeudi": "", "vendredi": "",
    "samedi": "", "dimanche": "",
}

def parse_date(v: str) -> str | None:
    v = v.strip()
    if not v:
        return None
    # Fast path: already ISO yyyy-mm-dd
    if re.match(r"^\d{4}-\d{2}-\d{2}$", v):
        return v
    # Translate non-English month/day names
    lowered = v.lower()
    for word, replacement in _MONTH_MAP.items():
        lowered = re.sub(r"\b" + re.escape(word) + r"\b", replacement, lowered)
    lowered = re.sub(r"[,.]", " ", lowered).strip()
    try:
        return dateutil_parser.parse(lowered, fuzzy=True, default=None).strftime("%Y-%m-%d")
    except Exception:
        return None

def parse_json(v: str):
    v = v.strip()
    if not v:
        return None
    try:
        return json.dumps(json.loads(v))
    except (json.JSONDecodeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Row mapping  (CSV column names  →  DB column names)
# ---------------------------------------------------------------------------

def row_to_db(r: dict) -> dict:
    return {
        "source_id":              parse_text(r["source_id"]),
        "title":                  r["title"],
        "body":                   r["body"],
        "outlet":                 r["outlet"],
        "published_at":           parse_date(r["published_at"]),
        "language":               parse_text(r["language"]),
        "word_count":             parse_int(r["word_count"]),
        "url":                    parse_text(r["url"]),
        "query_source":           parse_text(r["query_source"]),
        # sectors
        "sector_transport":       parse_bool(r["sector_transport"]),
        "sector_buildings":       parse_bool(r["sector_buildings"]),
        "sector_energy":          parse_bool(r["sector_energy"]),
        "sector_industry":        parse_bool(r["sector_industry"]),
        "sector_agriculture":     parse_bool(r["sector_agriculture"]),
        "sector_water":           parse_bool(r["sector_water"]),
        "sector_ecosystem":       parse_bool(r["sector_ecosystem"]),
        "sector_resource_economy": parse_bool(r["sector_resource"]),      # CSV: sector_resource
        # stages
        "stage_general_concepts": parse_bool(r["stage_concept"]),         # CSV: stage_concept
        "stage_causes":           parse_bool(r["stage_cause"]),           # CSV: stage_cause
        "stage_consequences":     parse_bool(r["stage_consequence"]),     # CSV: stage_consequence
        "stage_solutions":        parse_bool(r["stage_solution"]),        # CSV: stage_solution
        # domains
        "domain_climate":         parse_bool(r["domain_climate"]),
        "domain_biodiversity":    parse_bool(r["domain_biodiversity"]),
        "domain_resources":       parse_bool(r["domain_ressources"]),     # CSV: domain_ressources (French)
        # LexisNexis tags
        "ln_subject":             parse_text(r["subject"]),
        "ln_geographic":          parse_text(r["geographic"]),
        "ln_industry":            parse_text(r["industry"]),
        # timestamps
        "ingested_at":            parse_text(r["ingested_at"]),           # None → DB default NOW()
        "classified_at":          parse_text(r["classified_at"]),
        # frame probabilities  ← model_frame_* columns
        "frame_attribution":      parse_float(r["model_frame_attribution"]),
        "frame_human_interest":   parse_float(r["model_frame_human_interest"]),
        "frame_conflict":         parse_float(r["model_frame_conflict"]),
        "frame_morality":         parse_float(r["model_frame_morality"]),
        "frame_economic":         parse_float(r["model_frame_economic"]),
        # angle probabilities  ← model_angle_* columns
        "angle_health":           parse_float(r["model_angle_health"]),
        "angle_economics":        parse_float(r["model_angle_economics"]),
        "angle_jobs":             parse_float(r["model_angle_jobs"]),
        "angle_politics":         parse_float(r["model_angle_politics"]),
        "angle_geopolitics":      parse_float(r["model_angle_geopolitics"]),
        "angle_purchasing_power": parse_float(r["model_angle_purchasing_power"]),
        # explanations  ← *_attention_idx columns
        "explanation_frames":     parse_json(r["frame_attention_idx"]),
        "explanation_angles":     parse_json(r["angle_attention_idx"]),
    }


# ---------------------------------------------------------------------------
# SQL
# ---------------------------------------------------------------------------

INSERT_SQL = """
INSERT INTO articles (
    source_id, title, body, outlet, published_at, language, word_count, url, query_source,
    sector_transport, sector_buildings, sector_energy, sector_industry,
    sector_agriculture, sector_water, sector_ecosystem, sector_resource_economy,
    stage_general_concepts, stage_causes, stage_consequences, stage_solutions,
    domain_climate, domain_biodiversity, domain_resources,
    ln_subject, ln_geographic, ln_industry,
    ingested_at, classified_at,
    frame_attribution, frame_human_interest, frame_conflict, frame_morality, frame_economic,
    angle_health, angle_economics, angle_jobs, angle_politics, angle_geopolitics, angle_purchasing_power,
    explanation_frames, explanation_angles
) VALUES (
    %(source_id)s, %(title)s, %(body)s, %(outlet)s, %(published_at)s, %(language)s,
    %(word_count)s, %(url)s, %(query_source)s,
    %(sector_transport)s, %(sector_buildings)s, %(sector_energy)s, %(sector_industry)s,
    %(sector_agriculture)s, %(sector_water)s, %(sector_ecosystem)s, %(sector_resource_economy)s,
    %(stage_general_concepts)s, %(stage_causes)s, %(stage_consequences)s, %(stage_solutions)s,
    %(domain_climate)s, %(domain_biodiversity)s, %(domain_resources)s,
    %(ln_subject)s, %(ln_geographic)s, %(ln_industry)s,
    COALESCE(%(ingested_at)s::timestamptz, NOW()), %(classified_at)s,
    %(frame_attribution)s, %(frame_human_interest)s, %(frame_conflict)s, %(frame_morality)s, %(frame_economic)s,
    %(angle_health)s, %(angle_economics)s, %(angle_jobs)s, %(angle_politics)s,
    %(angle_geopolitics)s, %(angle_purchasing_power)s,
    %(explanation_frames)s::jsonb, %(explanation_angles)s::jsonb
)
ON CONFLICT (source_id) DO NOTHING
"""


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default=str(DEFAULT_CSV))
    parser.add_argument("--db",  default=DEFAULT_DB)
    parser.add_argument("--dry-run", action="store_true", help="parse only, skip DB writes")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        sys.exit(f"CSV not found: {csv_path}")

    print(f"Reading {csv_path} …")
    with open(csv_path, encoding="utf-8") as f:
        raw_rows = list(csv.DictReader(f))
    print(f"  {len(raw_rows):,} rows")

    db_rows, parse_errors = [], []
    for i, r in enumerate(raw_rows):
        try:
            mapped = row_to_db(r)
            if mapped["published_at"] is None:
                parse_errors.append((i + 2, f"unparseable date: {r['published_at']!r}"))
                continue
            db_rows.append(mapped)
        except Exception as e:
            parse_errors.append((i + 2, str(e)))

    if parse_errors:
        print(f"  {len(parse_errors)} parse error(s) (first 5):")
        for lineno, msg in parse_errors[:5]:
            print(f"    line {lineno}: {msg}")

    if args.dry_run:
        print("Dry run complete — no DB changes.")
        return

    print(f"\nConnecting …")
    conn = psycopg2.connect(args.db)

    # Step 1: truncate (committed immediately so the insert phase can retry freely)
    with conn:
        with conn.cursor() as cur:
            print("Truncating articles …")
            cur.execute("TRUNCATE articles RESTART IDENTITY CASCADE;")
    print("  Truncate committed.")

    # Step 2: insert in batches with per-batch savepoints
    inserted = skipped = 0
    BATCH = 500

    with conn:
        with conn.cursor() as cur:
            for start in range(0, len(db_rows), BATCH):
                batch = db_rows[start : start + BATCH]
                cur.execute("SAVEPOINT sp;")
                try:
                    psycopg2.extras.execute_batch(cur, INSERT_SQL, batch, page_size=BATCH)
                    cur.execute("RELEASE SAVEPOINT sp;")
                    inserted += len(batch)
                except Exception:
                    cur.execute("ROLLBACK TO SAVEPOINT sp;")
                    # Row-by-row fallback for this batch
                    for b in batch:
                        cur.execute("SAVEPOINT sp_row;")
                        try:
                            cur.execute(INSERT_SQL, b)
                            cur.execute("RELEASE SAVEPOINT sp_row;")
                            inserted += 1
                        except Exception as e:
                            cur.execute("ROLLBACK TO SAVEPOINT sp_row;")
                            skipped += 1
                            if skipped <= 5:
                                print(f"  skipped (source_id={b.get('source_id')}): {e}")

                pct = min((start + len(batch)) / len(db_rows) * 100, 100)
                print(f"  {start + len(batch):,} / {len(db_rows):,}  ({pct:.0f}%)", end="\r")

    conn.close()
    print(f"\nDone.  {inserted:,} inserted,  {skipped} skipped.")


if __name__ == "__main__":
    main()
