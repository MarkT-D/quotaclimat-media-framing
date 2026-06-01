import json
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger(__name__)

CALIBRATIONS = {
    "Conflict":              {"W": 1.0098, "b": -0.1047},
    "Economic Consequences": {"W": 0.6491, "b": -1.2076},
    "Human Interest":        {"W": 0.6111, "b": -0.2337},
    "Morality":              {"W": 1.0935, "b":  1.7397},
    "Responsibility":        {"W": 0.5278, "b": -0.6062},
}

LABEL_MAP = {"Responsibility": "Attribution of Responsibility"}

predictor = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global predictor
    checkpoint = os.getenv("FRAME_MODEL_PATH", "")
    if checkpoint and Path(checkpoint).is_dir():
        sys.path.insert(0, str(Path(__file__).parent / "analysis"))
        from deployment_1 import Predictor  # type: ignore
        logger.info("Loading frame classifier from %s …", checkpoint)
        predictor = Predictor(checkpoint_path=checkpoint, calibrations=CALIBRATIONS)
        logger.info("Model ready.")
    else:
        logger.warning("FRAME_MODEL_PATH not set or not found — /classify will return 503")
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
    return {"status": "ok", "model_loaded": predictor is not None}


class ClassifyRequest(BaseModel):
    text: str


@app.post("/classify")
def classify(req: ClassifyRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Model not loaded — set FRAME_MODEL_PATH env var")

    results = predictor.predict([req.text], batch_size=1, explain=True)
    r = results[0]
    raw_probs: dict = r["probabilities"]

    frame_scores = {LABEL_MAP.get(k, k): v for k, v in raw_probs.items()}
    primary_frame = max(frame_scores, key=lambda k: frame_scores[k])
    explanation = json.loads(r.get("explanation", "[]"))

    return {
        "frameScores": frame_scores,
        "primaryFrame": primary_frame,
        "explanation": explanation,
    }


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    content = await file.read()
    filename = file.filename or ""

    if filename.lower().endswith(".txt"):
        text = content.decode("utf-8", errors="replace")

    elif filename.lower().endswith(".pdf"):
        try:
            import io
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            text = "\n\n".join(
                (page.extract_text() or "").strip()
                for page in reader.pages
            )
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"PDF extraction failed: {e}")

    elif filename.lower().endswith((".docx", ".doc")):
        try:
            import io
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"DOCX extraction failed: {e}")

    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use .txt, .pdf, or .docx")

    lines = [l.strip() for l in text.splitlines() if l.strip()]
    stem = Path(filename).stem
    suggested_title = (lines[0][:200] if lines else stem) or stem

    return {"text": text, "suggestedTitle": suggested_title}
