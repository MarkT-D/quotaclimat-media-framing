"""
Batch-classify all articles in the database.

Currently runs the frame classifier only. Angle classification will be added
once the angle model is trained — see the TODO section below.

Usage (from backend/):
    python classify_db.py                     # classify all unclassified articles
    python classify_db.py --limit 500         # cap at 500 articles
    python classify_db.py --force             # re-run already-classified rows
    python classify_db.py --batch-size 16     # smaller GPU batches
    python classify_db.py --dry-run           # report row count only, no writes

Reads DATABASE_URL and FRAME_MODEL_PATH from ../.env (or the environment).
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

# ── label/column mappings ──────────────────────────────────────────────────

CALIBRATIONS = {
    "Conflict":              {"W": 1.0098, "b": -0.1047},
    "Economic Consequences": {"W": 0.6491, "b": -1.2076},
    "Human Interest":        {"W": 0.6111, "b": -0.2337},
    "Morality":              {"W": 1.0935, "b":  1.7397},
    "Responsibility":        {"W": 0.5278, "b": -0.6062},
}

LABEL_MAP = {"Responsibility": "Attribution of Responsibility"}

FRAME_COL_MAP = {
    "Attribution of Responsibility": "frame_attribution",
    "Human Interest":                "frame_human_interest",
    "Conflict":                      "frame_conflict",
    "Morality":                      "frame_morality",
    "Economic Consequences":         "frame_economic",
}

# TODO: add angle model and ANGLE_COL_MAP when angle classifier is trained
# ANGLE_COL_MAP = {
#     "Health":           "angle_health",
#     "Economics":        "angle_economics",
#     "Jobs":             "angle_jobs",
#     "Politics":         "angle_politics",
#     "Geopolitics":      "angle_geopolitics",
#     "Purchasing Power": "angle_purchasing_power",
# }


# ── DB helpers ─────────────────────────────────────────────────────────────

def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL not set — check your .env file")
    return psycopg2.connect(url)


def fetch_unclassified(conn, limit: int | None, force: bool) -> list[dict]:
    where = "" if force else "WHERE classified_at IS NULL"
    lim   = f"LIMIT {limit}" if limit else ""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(f"SELECT id, title, body FROM articles {where} ORDER BY id {lim}")
        return [dict(r) for r in cur.fetchall()]


def write_frames(conn, article_id: int, probs: dict[str, float], explanation: dict):
    cols   = {FRAME_COL_MAP[k]: v for k, v in probs.items() if k in FRAME_COL_MAP}
    now    = datetime.now(timezone.utc)
    update = ", ".join(f"{c} = %s" for c in cols)
    vals   = list(cols.values()) + [json.dumps(explanation), now, article_id]
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE articles SET {update}, explanation_frames = %s, classified_at = %s WHERE id = %s",
            vals,
        )
    conn.commit()

# TODO: add write_angles(conn, article_id, probs, explanation) when angle model is ready


# ── main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Batch-classify articles in the DB")
    parser.add_argument("--batch-size", type=int, default=32,  help="Articles per GPU batch")
    parser.add_argument("--limit",      type=int, default=None, help="Max articles to process")
    parser.add_argument("--force",      action="store_true",   help="Re-classify already-classified rows")
    parser.add_argument("--dry-run",    action="store_true",   help="Count rows only, no writes")
    args = parser.parse_args()

    conn = get_conn()
    rows = fetch_unclassified(conn, args.limit, args.force)

    print(f"Articles to classify: {len(rows)}")
    if args.dry_run or not rows:
        conn.close()
        return

    # Load model
    checkpoint = os.getenv("FRAME_MODEL_PATH",
                           str(Path(__file__).parent / "analysis" / "checkpoint-2970"))
    if not Path(checkpoint).is_dir():
        sys.exit(f"Checkpoint not found: {checkpoint}\nSet FRAME_MODEL_PATH or place the checkpoint at the default path.")

    sys.path.insert(0, str(Path(__file__).parent / "analysis"))
    from deployment_1 import Predictor  # type: ignore

    print(f"Loading model from {checkpoint} …")
    predictor = Predictor(checkpoint_path=checkpoint, calibrations=CALIBRATIONS)
    print("Model ready.\n")

    texts = [f"Title: {r['title']}\nBody: {r['body']}" for r in rows]
    ids   = [r["id"] for r in rows]

    results = predictor.predict(texts, batch_size=args.batch_size, explain=True)

    ok = skipped = 0
    for article_id, result in zip(ids, results):
        raw_probs: dict = result["probabilities"]
        probs = {LABEL_MAP.get(k, k): v for k, v in raw_probs.items()}
        explanation: dict = json.loads(result.get("explanation", "{}"))
        try:
            write_frames(conn, article_id, probs, explanation)
            ok += 1
        except Exception as e:
            print(f"  [WARN] id={article_id}: {e}")
            conn.rollback()
            skipped += 1

    conn.close()
    print(f"\nDone — {ok} classified, {skipped} skipped.")


if __name__ == "__main__":
    main()
