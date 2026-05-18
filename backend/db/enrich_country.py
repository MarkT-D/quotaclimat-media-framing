#!/usr/bin/env python3
"""Populate the `country` column in the articles table.

Phase 1 (always runs):
  - Fetches all distinct outlet names from the DB
  - Asks Claude to identify each outlet's ISO 3166-1 alpha-2 country code
  - Saves the mapping to outlet_country_map.json
  - UPDATEs articles.country for every resolved outlet

Phase 2 (interactive, opt-in):
  - Shows how many articles remain NULL
  - Prompts whether to apply ln_geographic parsing
  - Prompts whether to apply URL TLD parsing

Usage:
    python enrich_country.py [--dsn DSN] [--dry-run] [--map-only] [--yes-all]

Env:
    DATABASE_URL  Postgres DSN (overrides --dsn)
    ANTHROPIC_API_KEY  required for Claude API calls
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

import anthropic
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

MAP_PATH = Path(__file__).parent / "outlet_country_map.json"

# ---------------------------------------------------------------------------
# Claude outlet classification
# ---------------------------------------------------------------------------

CLAUDE_PROMPT = """\
You are given a list of news outlet names. For each outlet, return the ISO 3166-1 alpha-2 \
country code of the country where that outlet is primarily based (e.g. "FR" for France, \
"GB" for the United Kingdom, "NG" for Nigeria).

Rules:
- Return exactly the two-letter uppercase ISO code, or null if you are not confident.
- For outlets clearly identifiable as French regional papers, return "FR".
- Do not guess. If ambiguous, return null.

Respond with a single JSON object mapping each outlet name to its code (or null).
Example: {{"Le Monde": "FR", "The Guardian": "GB", "Unknown Post": null}}

Outlets:
{outlets}
"""

BATCH_SIZE = 150


def _classify_batch(client: anthropic.Anthropic, outlets: list[str]) -> dict[str, str | None]:
    outlet_list = "\n".join(f"- {o}" for o in outlets)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=16384,
        messages=[{"role": "user", "content": CLAUDE_PROMPT.format(outlets=outlet_list)}],
    )
    text = message.content[0].text.strip()
    text = re.sub(r"^```[a-z]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


def classify_outlets_with_claude(outlets: list[str]) -> dict[str, str | None]:
    client = anthropic.Anthropic()
    results: dict[str, str | None] = {}
    batches = [outlets[i:i + BATCH_SIZE] for i in range(0, len(outlets), BATCH_SIZE)]
    for idx, batch in enumerate(batches, 1):
        print(f"  Calling Claude API: batch {idx}/{len(batches)} ({len(batch)} outlets)...", flush=True)
        batch_result = _classify_batch(client, batch)
        results.update(batch_result)
    return results


# ---------------------------------------------------------------------------
# Fallback helpers
# ---------------------------------------------------------------------------

# Minimal set of country names found in ln_geographic -> ISO codes
_LN_COUNTRY_ISO: dict[str, str] = {
    "FRANCE": "FR", "UNITED KINGDOM": "GB", "GERMANY": "DE", "UNITED STATES": "US",
    "CANADA": "CA", "AUSTRALIA": "AU", "INDIA": "IN", "NIGERIA": "NG",
    "BRAZIL": "BR", "SPAIN": "ES", "ITALY": "IT", "NETHERLANDS": "NL",
    "BELGIUM": "BE", "SWITZERLAND": "CH", "SWEDEN": "SE", "NORWAY": "NO",
    "DENMARK": "DK", "FINLAND": "FI", "PORTUGAL": "PT", "AUSTRIA": "AT",
    "POLAND": "PL", "JAPAN": "JP", "CHINA": "CN", "SOUTH AFRICA": "ZA",
    "KENYA": "KE", "EGYPT": "EG", "MEXICO": "MX", "ARGENTINA": "AR",
    "CHILE": "CL", "COLOMBIA": "CO", "PAKISTAN": "PK", "BANGLADESH": "BD",
    "INDONESIA": "ID", "PHILIPPINES": "PH", "THAILAND": "TH", "VIETNAM": "VN",
    "SINGAPORE": "SG", "NEW ZEALAND": "NZ", "IRELAND": "IE", "UKRAINE": "UA",
    "RUSSIA": "RU", "TURKEY": "TR", "SAUDI ARABIA": "SA", "UAE": "AE",
    "MOROCCO": "MA", "GHANA": "GH", "ETHIOPIA": "ET", "TANZANIA": "TZ",
}

_LN_ENTRY_RE = re.compile(r"^([^,(]+)\s+\((\d+)%\)$")


def country_from_ln_geo(ln_geo: str) -> str | None:
    if not ln_geo:
        return None
    best_name, best_conf = None, -1
    for part in ln_geo.split(";"):
        m = _LN_ENTRY_RE.match(part.strip())
        if not m:
            continue
        name, conf = m.group(1).strip().upper(), int(m.group(2))
        if "," in name:  # skip "PARIS, FRANCE" city entries
            continue
        if conf > best_conf and name in _LN_COUNTRY_ISO:
            best_name, best_conf = name, conf
    return _LN_COUNTRY_ISO.get(best_name) if best_name else None


_TLD_ISO: dict[str, str] = {
    "fr": "FR", "uk": "GB", "co.uk": "GB", "de": "DE", "es": "ES",
    "it": "IT", "nl": "NL", "be": "BE", "ch": "CH", "at": "AT",
    "se": "SE", "no": "NO", "dk": "DK", "fi": "FI", "pt": "PT",
    "pl": "PL", "au": "AU", "nz": "NZ", "ca": "CA", "in": "IN",
    "ng": "NG", "za": "ZA", "ke": "KE", "eg": "EG", "gh": "GH",
    "br": "BR", "mx": "MX", "ar": "AR", "cl": "CL", "co": "CO",
    "jp": "JP", "cn": "CN", "sg": "SG", "ph": "PH", "th": "TH",
    "vn": "VN", "id": "ID", "pk": "PK", "bd": "BD", "ie": "IE",
    "ua": "UA", "tr": "TR", "ma": "MA",
}


def country_from_url(url: str) -> str | None:
    if not url:
        return None
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return None
    # Check .co.uk first (two-part TLD)
    if host.endswith(".co.uk"):
        return "GB"
    parts = host.split(".")
    if len(parts) >= 2:
        tld = parts[-1].lower()
        return _TLD_ISO.get(tld)
    return None


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _prompt_yes(question: str, auto_yes: bool) -> bool:
    if auto_yes:
        print(f"{question} [auto-yes]")
        return True
    resp = input(f"{question} (y/N) ").strip().lower()
    return resp == "y"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dsn",      default=os.getenv("DATABASE_URL", "postgresql://localhost/quota_climate"))
    parser.add_argument("--dry-run",  action="store_true", help="No DB writes")
    parser.add_argument("--map-only", action="store_true", help="Generate outlet_country_map.json only, skip DB updates")
    parser.add_argument("--yes-all",  action="store_true", help="Auto-accept all fallback prompts")
    args = parser.parse_args()

    conn = None if (args.dry_run or args.map_only) else psycopg2.connect(args.dsn)

    # ------------------------------------------------------------------
    # Phase 1: Claude outlet lookup
    # ------------------------------------------------------------------
    print("\n-- Phase 1: Claude outlet classification --")

    read_conn = psycopg2.connect(args.dsn)
    with read_conn.cursor() as cur:
        cur.execute("SELECT DISTINCT outlet FROM articles WHERE outlet IS NOT NULL ORDER BY outlet")
        outlets = [row[0] for row in cur.fetchall()]
    read_conn.close()

    print(f"  {len(outlets)} distinct outlets found in DB")

    # Load existing map so we can skip already-classified outlets
    existing_map: dict[str, str | None] = {}
    if MAP_PATH.exists():
        with MAP_PATH.open(encoding="utf-8") as fh:
            existing_map = json.load(fh)
        print(f"  Loaded existing map ({len(existing_map)} entries) - classifying new outlets only")

    new_outlets = [o for o in outlets if o not in existing_map]
    if new_outlets:
        new_results = classify_outlets_with_claude(new_outlets)
        existing_map.update(new_results)
    else:
        print("  All outlets already in map - skipping Claude API call")

    outlet_map = existing_map

    if not args.dry_run:
        with MAP_PATH.open("w", encoding="utf-8") as fh:
            json.dump(outlet_map, fh, ensure_ascii=False, indent=2, sort_keys=True)
        print(f"  Saved -> {MAP_PATH}")

    resolved = {k: v for k, v in outlet_map.items() if v}
    unresolved = {k for k, v in outlet_map.items() if not v}
    print(f"  Outlets resolved:   {len(resolved)} / {len(outlets)}")
    print(f"  Outlets unresolved: {len(unresolved)}")

    if args.map_only:
        print("\n--map-only flag set - stopping before DB update.")
        return

    # Apply Claude map to DB
    updated_phase1 = 0
    if not args.dry_run:
        with conn.cursor() as cur:
            for outlet_name, code in resolved.items():
                cur.execute(
                    "UPDATE articles SET country = %s WHERE outlet = %s AND (country IS NULL OR country != %s)",
                    (code, outlet_name, code),
                )
                updated_phase1 += cur.rowcount
        conn.commit()
    else:
        updated_phase1 = sum(1 for v in resolved.values() if v)

    # Count remaining NULLs and what fallbacks could cover
    read_conn = psycopg2.connect(args.dsn)
    with read_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM articles WHERE country IS NULL")
        null_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM articles WHERE country IS NULL AND ln_geographic IS NOT NULL AND ln_geographic != ''")
        ln_geo_eligible = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM articles WHERE country IS NULL AND url IS NOT NULL AND url != ''")
        url_eligible = cur.fetchone()[0]
    read_conn.close()

    print(f"\n  Articles updated:     {updated_phase1:,}")
    print(f"  Articles still NULL:  {null_count:,}")
    if null_count:
        print(f"    - {ln_geo_eligible:,} have ln_geographic data")
        print(f"    - {url_eligible:,} have a URL (TLD-parseable)")

    # ------------------------------------------------------------------
    # Phase 2: interactive fallbacks
    # ------------------------------------------------------------------
    if null_count == 0:
        print("\nAll articles have a country. Done.")
        if conn:
            conn.close()
        return

    print("\n-- Phase 2: Optional fallbacks --")

    # Fallback A: ln_geographic
    updated_lng = 0
    if ln_geo_eligible and _prompt_yes(f"\n  Apply fallback: ln_geographic parsing? ({ln_geo_eligible:,} articles eligible)", args.yes_all):
        if not args.dry_run:
            read_conn = psycopg2.connect(args.dsn)
            with read_conn.cursor() as cur:
                cur.execute("SELECT id, ln_geographic FROM articles WHERE country IS NULL AND ln_geographic IS NOT NULL AND ln_geographic != ''")
                rows = cur.fetchall()
            read_conn.close()

            batch = [(country_from_ln_geo(geo), aid) for aid, geo in rows if country_from_ln_geo(geo)]
            if batch:
                with conn.cursor() as cur:
                    psycopg2.extras.execute_batch(
                        cur,
                        "UPDATE articles SET country = %s WHERE id = %s",
                        batch,
                    )
                conn.commit()
                updated_lng = len(batch)
        print(f"    -> {updated_lng:,} articles updated via ln_geographic")

    # Fallback B: URL TLD
    updated_url = 0
    if url_eligible and _prompt_yes(f"\n  Apply fallback: URL TLD parsing? ({url_eligible:,} articles eligible)", args.yes_all):
        if not args.dry_run:
            read_conn = psycopg2.connect(args.dsn)
            with read_conn.cursor() as cur:
                cur.execute("SELECT id, url FROM articles WHERE country IS NULL AND url IS NOT NULL AND url != ''")
                rows = cur.fetchall()
            read_conn.close()

            batch = [(country_from_url(url), aid) for aid, url in rows if country_from_url(url)]
            if batch:
                with conn.cursor() as cur:
                    psycopg2.extras.execute_batch(
                        cur,
                        "UPDATE articles SET country = %s WHERE id = %s",
                        batch,
                    )
                conn.commit()
                updated_url = len(batch)
        print(f"    -> {updated_url:,} articles updated via URL TLD")

    # Final summary
    read_conn = psycopg2.connect(args.dsn)
    with read_conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM articles WHERE country IS NULL")
        final_null = cur.fetchone()[0]
    read_conn.close()

    print(f"\n-- Final state --")
    print(f"  Phase 1 (Claude):       {updated_phase1:,} articles")
    print(f"  Phase 2a (ln_geographic): {updated_lng:,} articles")
    print(f"  Phase 2b (URL TLD):       {updated_url:,} articles")
    print(f"  Still NULL:               {final_null:,} articles")

    if conn:
        conn.close()


if __name__ == "__main__":
    main()
