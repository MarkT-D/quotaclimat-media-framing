"""
Ingest scraped JSONL files into the articles table.

Usage (from backend/):
    python -m db.ingest                          # all files in scraper/output/
    python -m db.ingest --file climate.jsonl     # single file
    python -m db.ingest --dry-run                # parse only, no DB writes

Reads DATABASE_URL from ../.env or the environment.
"""

import argparse
import json
import os
import sys
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

_MAP_PATH = Path(__file__).parent / "outlet_country_map.json"

def _load_outlet_map() -> dict[str, str]:
    if _MAP_PATH.exists():
        with _MAP_PATH.open(encoding="utf-8") as fh:
            return json.load(fh)
    return {}

OUTLET_COUNTRY_MAP: dict[str, str] = _load_outlet_map()

OUTPUT_DIR = Path(__file__).parent.parent / "scraper" / "output"

load_dotenv(Path(__file__).parent.parent.parent / ".env")


def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL not set — check your .env file")
    return psycopg2.connect(url)


def parse_article(raw: dict, query_source: str) -> dict:
    clf = raw.get("classification") or {}
    outlet = raw.get("outlet", "").strip()
    return {
        "title":        raw.get("title", "").strip(),
        "body":         raw.get("body", "").strip(),
        "outlet":       outlet,
        "published_at": raw.get("published_at") or None,
        "language":     clf.get("Language", "").strip() or None,
        "country":      OUTLET_COUNTRY_MAP.get(outlet),
        "word_count":   raw.get("word_count") or None,
        "url":          raw.get("url", "").strip(),
        "query_source": query_source,
        "ln_subject":   clf.get("Subject", "").strip() or None,
        "ln_geographic":clf.get("Geographic", "").strip() or None,
        "ln_industry":  clf.get("Industry", "").strip() or None,
        "scraped_at":   raw.get("scraped_at") or None,
    }


INSERT_SQL = """
INSERT INTO articles (
    title, body, outlet, published_at, language, country,
    word_count, url, query_source,
    ln_subject, ln_geographic, ln_industry,
    scraped_at
) VALUES (
    %(title)s, %(body)s, %(outlet)s, %(published_at)s, %(language)s, %(country)s,
    %(word_count)s, %(url)s, %(query_source)s,
    %(ln_subject)s, %(ln_geographic)s, %(ln_industry)s,
    %(scraped_at)s
)
ON CONFLICT (url) DO NOTHING
"""


def ingest_file(cur, path: Path, dry_run: bool) -> tuple[int, int]:
    query_source = path.stem
    inserted = skipped = 0

    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  [WARN] bad JSON in {path.name}: {e}")
                continue

            row = parse_article(raw, query_source)

            if not row["url"]:
                print(f"  [WARN] skipping article with no URL: {row['title'][:60]}")
                skipped += 1
                continue

            if not dry_run:
                cur.execute(INSERT_SQL, row)
                if cur.rowcount:
                    inserted += 1
                else:
                    skipped += 1
            else:
                inserted += 1  # count as "would insert" in dry-run

    return inserted, skipped


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", metavar="NAME",
                        help="Ingest a single JSONL file from scraper/output/")
    parser.add_argument("--dry-run", action="store_true",
                        help="Parse files but do not write to the database")
    args = parser.parse_args()

    files = (
        [OUTPUT_DIR / args.file] if args.file
        else sorted(OUTPUT_DIR.glob("*.jsonl"))
    )

    if not files:
        sys.exit(f"No .jsonl files found in {OUTPUT_DIR}")

    missing = [f for f in files if not f.exists()]
    if missing:
        sys.exit(f"File not found: {missing[0]}")

    if args.dry_run:
        print("[DRY RUN] no database writes\n")
        conn = cur = None
    else:
        conn = get_conn()
        cur = conn.cursor()

    total_inserted = total_skipped = 0

    for path in files:
        print(f"{path.name} ...", end=" ", flush=True)
        ins, skip = ingest_file(cur, path, args.dry_run)
        if not args.dry_run:
            conn.commit()
        label = "would insert" if args.dry_run else "inserted"
        print(f"{ins} {label}, {skip} skipped")
        total_inserted += ins
        total_skipped += skip

    if conn:
        conn.close()

    print(f"\nTotal: {total_inserted} inserted, {total_skipped} skipped (duplicates or no URL)")


if __name__ == "__main__":
    main()
