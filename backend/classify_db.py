"""
Batch-classify all articles in the database.

Runs the frame classifier and the angle classifier in sequence, writing
probabilities and attention-based explanations back to the articles table.

Usage (from backend/):
    python classify_db.py                     # classify all unclassified articles
    python classify_db.py --limit 500         # cap at 500 articles
    python classify_db.py --force             # re-run already-classified rows
    python classify_db.py --batch-size 16     # smaller GPU batches
    python classify_db.py --dry-run           # report row count only, no writes

Reads DATABASE_URL from ../.env (or the environment).
Override model paths with FRAME_MODEL_PATH / ANGLE_MODEL_PATH env vars.
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

FRAME_CALIBRATIONS = {
    "Conflict":              {"W": 1.0098, "b": -0.1047},
    "Economic Consequences": {"W": 0.6491, "b": -1.2076},
    "Human Interest":        {"W": 0.6111, "b": -0.2337},
    "Morality":              {"W": 1.0935, "b":  1.7397},
    "Responsibility":        {"W": 0.5278, "b": -0.6062},
}

FRAME_LABEL_MAP = {"Responsibility": "Attribution of Responsibility"}

FRAME_COL_MAP = {
    "Attribution of Responsibility": "frame_attribution",
    "Human Interest":                "frame_human_interest",
    "Conflict":                      "frame_conflict",
    "Morality":                      "frame_morality",
    "Economic Consequences":         "frame_economic",
}

ANGLE_COL_MAP = {
    "Economics":       "angle_economics",
    "Geopolitics":     "angle_geopolitics",
    "Health":          "angle_health",
    "Jobs":            "angle_jobs",
    "Politics":        "angle_politics",
    "Purchasing Power": "angle_purchasing_power",
}


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


def write_angles(conn, article_id: int, probs: dict[str, float], explanation: dict):
    cols   = {ANGLE_COL_MAP[k]: v for k, v in probs.items() if k in ANGLE_COL_MAP}
    update = ", ".join(f"{c} = %s" for c in cols)
    vals   = list(cols.values()) + [json.dumps(explanation), article_id]
    with conn.cursor() as cur:
        cur.execute(
            f"UPDATE articles SET {update}, explanation_angles = %s WHERE id = %s",
            vals,
        )
    conn.commit()


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

    _models_root = Path(__file__).parent.parent.parent / "models"

    frame_checkpoint = os.getenv("FRAME_MODEL_PATH", str(_models_root / "finalmodel"))
    angle_checkpoint = os.getenv("ANGLE_MODEL_PATH", str(_models_root / "finalangle"))

    if not Path(frame_checkpoint).is_dir():
        sys.exit(f"Frame checkpoint not found: {frame_checkpoint}\nSet FRAME_MODEL_PATH to override.")
    if not Path(angle_checkpoint).is_dir():
        sys.exit(f"Angle checkpoint not found: {angle_checkpoint}\nSet ANGLE_MODEL_PATH to override.")

    sys.path.insert(0, str(Path(__file__).parent / "analysis"))
    from deployment_1 import Predictor  # type: ignore

    print(f"Loading frame model from {frame_checkpoint} …")
    frame_predictor = Predictor(checkpoint_path=frame_checkpoint, calibrations=FRAME_CALIBRATIONS)
    print(f"Loading angle model from {angle_checkpoint} …")
    angle_predictor = Predictor(checkpoint_path=angle_checkpoint, calibrations=None)
    print("Models ready.\n")

    texts = [f"Title: {r['title']}\nBody: {r['body']}" for r in rows]
    ids   = [r["id"] for r in rows]

    print("Running frame classifier …")
    frame_results = frame_predictor.predict(texts, batch_size=args.batch_size, explain=True)
    print("Running angle classifier …")
    angle_results = angle_predictor.predict(texts, batch_size=args.batch_size, explain=True)

    ok = skipped = 0
    for article_id, frame_result, angle_result in zip(ids, frame_results, angle_results):
        raw_frame_probs: dict = frame_result["probabilities"]
        frame_probs = {FRAME_LABEL_MAP.get(k, k): v for k, v in raw_frame_probs.items()}
        frame_explanation: dict = json.loads(frame_result.get("explanation", "{}"))

        angle_probs: dict = angle_result["probabilities"]
        angle_explanation: dict = json.loads(angle_result.get("explanation", "{}"))

        try:
            write_frames(conn, article_id, frame_probs, frame_explanation)
            write_angles(conn, article_id, angle_probs, angle_explanation)
            ok += 1
        except Exception as e:
            print(f"  [WARN] id={article_id}: {e}")
            conn.rollback()
            skipped += 1

    conn.close()
    print(f"\nDone — {ok} classified, {skipped} skipped.")


if __name__ == "__main__":
    main()
