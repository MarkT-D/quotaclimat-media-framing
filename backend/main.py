import json
import logging
import os
import re
import sys
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv(Path(__file__).parent.parent / ".env")

logger = logging.getLogger("uvicorn.error")  # shares uvicorn's handler so output is visible

CALIBRATIONS = {
    "Conflict":              {"W": 1.0098, "b": -0.1047},
    "Economic Consequences": {"W": 0.6491, "b": -1.2076},
    "Human Interest":        {"W": 0.6111, "b": -0.2337},
    "Morality":              {"W": 1.0935, "b":  1.7397},
    "Responsibility":        {"W": 0.5278, "b": -0.6062},
}

LABEL_MAP = {"Responsibility": "Attribution of Responsibility"}

_predictor = None
_angle_predictor = None
_load_lock = threading.Lock()
_angle_load_lock = threading.Lock()
_checkpoint: str = ""
_angle_checkpoint: str = ""


def _get_predictor():
    global _predictor
    if _predictor is not None:
        return _predictor
    with _load_lock:
        if _predictor is not None:
            return _predictor
        if not _checkpoint or not Path(_checkpoint).is_dir():
            return None
        sys.path.insert(0, str(Path(__file__).parent / "analysis"))
        from deployment_1 import Predictor  # type: ignore
        logger.info("Loading frame classifier from %s …", _checkpoint)
        _predictor = Predictor(checkpoint_path=_checkpoint, calibrations=CALIBRATIONS)
        logger.info("Frame model ready.")
        return _predictor


def _get_angle_predictor():
    global _angle_predictor
    if _angle_predictor is not None:
        return _angle_predictor
    with _angle_load_lock:
        if _angle_predictor is not None:
            return _angle_predictor
        if not _angle_checkpoint or not Path(_angle_checkpoint).is_dir():
            return None
        sys.path.insert(0, str(Path(__file__).parent / "analysis"))
        from deployment_1 import Predictor  # type: ignore
        logger.info("Loading angle classifier from %s …", _angle_checkpoint)
        _angle_predictor = Predictor(checkpoint_path=_angle_checkpoint, calibrations=None)
        logger.info("Angle model ready.")
        return _angle_predictor


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _checkpoint, _angle_checkpoint
    _models_root = Path(__file__).parent.parent.parent / "models"
    _checkpoint = os.getenv("FRAME_MODEL_PATH", str(_models_root / "finalmodel"))
    _angle_checkpoint = os.getenv("ANGLE_MODEL_PATH", str(_models_root / "finalangle"))
    if not Path(_checkpoint).is_dir():
        logger.warning("Frame checkpoint not found at %s — /classify will return 503", _checkpoint)
    else:
        logger.info("Frame checkpoint found — loading in background…")
        threading.Thread(target=_get_predictor, daemon=True).start()
    if not Path(_angle_checkpoint).is_dir():
        logger.warning("Angle checkpoint not found at %s — angle scores will be empty", _angle_checkpoint)
    else:
        logger.info("Angle checkpoint found — loading in background…")
        threading.Thread(target=_get_angle_predictor, daemon=True).start()
    yield


app = FastAPI(title="Quota Climate API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _predictor is not None, "checkpoint": _checkpoint}


class ClassifyRequest(BaseModel):
    text: str


@app.post("/classify")
def classify(req: ClassifyRequest):
    predictor = _get_predictor()
    if predictor is None:
        raise HTTPException(status_code=503, detail="Checkpoint not found — set FRAME_MODEL_PATH env var")

    results = predictor.predict([req.text], batch_size=1, explain=True)
    r = results[0]
    raw_probs: dict = r["probabilities"]

    frame_scores = {LABEL_MAP.get(k, k): v for k, v in raw_probs.items()}
    primary_frame = max(frame_scores, key=lambda k: frame_scores[k])
    explanation: dict = json.loads(r.get("explanation", "{}"))

    logger.info("── Classification ──────────────────────────")
    for label, score in sorted(frame_scores.items(), key=lambda x: x[1], reverse=True):
        bar = "█" * int(score * 20)
        logger.info("  %-30s %.3f  %s", label, score, bar)
    logger.info("  → primary: %s", primary_frame)

    if explanation:
        words = req.text.split()
        top = sorted(explanation.items(), key=lambda x: x[1], reverse=True)[:15]
        logger.info("── Attention (top %d tokens) ─────────────", len(top))
        for idx, score in top:
            word = words[int(idx)] if int(idx) < len(words) else "?"
            bar = "█" * int(score * 40)
            logger.info("  [%4s] %-20s %.4f  %s", idx, word, score, bar)

    angle_scores: dict = {}
    angle_explanation: dict = {}
    angle_predictor = _get_angle_predictor()
    if angle_predictor:
        angle_results = angle_predictor.predict([req.text], batch_size=1, explain=True)
        ar = angle_results[0]
        angle_scores = ar["probabilities"]
        angle_explanation = json.loads(ar.get("explanation", "{}"))
        primary_angle = max(angle_scores, key=lambda k: angle_scores[k]) if angle_scores else None
    else:
        primary_angle = None

    return {
        "frameScores":       frame_scores,
        "primaryFrame":      primary_frame,
        "explanation":       explanation,
        "angleScores":       angle_scores,
        "primaryAngle":      primary_angle,
        "explanationAngles": angle_explanation,
    }


def _extract_pdf_text(reader) -> tuple[str, str]:
    """
    Returns (body_text, suggested_title).
    Handles LexisNexis PDFs (Body/Classification markers) and generic PDFs.
    """
    pages = [p.extract_text() or "" for p in reader.pages]
    full  = "\n".join(pages)

    # ── LexisNexis format detection ──────────────────────────────────────────
    if "LexisNexis" in full:
        # Page 0 is search-metadata header; article starts on page 1
        article_text = "\n".join(pages[1:])

        # Body is explicitly delimited
        body_m = re.search(
            r'\bBody\n(.+?)(?:\nLink naar|\nClassification\b|\nLanguage\s*:|\Z)',
            article_text, re.DOTALL | re.IGNORECASE,
        )
        body = body_m.group(1).strip() if body_m else article_text

        # Title is the first real line after "Page 1 of N"
        title_m = re.search(r'Page 1 of \d+\n(.+?)(?:\n|$)', article_text)
        title   = title_m.group(1).strip() if title_m else ""

        return body, title

    # ── Generic PDF ──────────────────────────────────────────────────────────
    return full.strip(), ""


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    import io
    content  = await file.read()
    filename = file.filename or ""
    hint_title = ""

    if filename.lower().endswith(".txt"):
        text = content.decode("utf-8", errors="replace")

    elif filename.lower().endswith(".pdf"):
        try:
            from pypdf import PdfReader
            text, hint_title = _extract_pdf_text(PdfReader(io.BytesIO(content)))
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF extraction failed: {e}")

    elif filename.lower().endswith((".docx", ".doc")):
        try:
            from docx import Document
            doc  = Document(io.BytesIO(content))
            text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"DOCX extraction failed: {e}")

    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use .txt, .pdf, or .docx")

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    stem  = Path(filename).stem
    suggested_title = hint_title or (lines[0][:200] if lines else stem) or stem

    return {"text": text, "suggestedTitle": suggested_title}
