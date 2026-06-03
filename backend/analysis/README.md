# Media Framing Classification Pipeline

Multi-stage pipeline for classifying climate news articles by framing category. Uses `Llama-3.3-70B-Instruct` (via vLLM) to generate ground-truth labels, then distils them into a fine-tuned `XLM-RoBERTa-Longformer` classifier.

---

## Pipeline overview

```
Raw articles (CSV)
      │
      ▼
preprocessor.py     ← clean text, normalise fields
      │
      ▼
labeller.py         ← LLM batch labelling (vLLM + guided JSON)
      │
      ▼
classifier.py       ← fine-tune XLM-RoBERTa on LLM labels
      │
      ▼
deployment_1.py     ← calibrated inference + attention explanation
      │
      ▼
backend/main.py     ← FastAPI endpoint (/classify)
```

---

## Components

### `preprocessor.py`

Cleans the raw dataset before labelling or training. Strips HTML artefacts, normalises whitespace, and removes articles below a minimum word count. Can be extended to handle incoming articles from new scraper runs.

```bash
python preprocessor.py --input raw.csv --output clean.csv
```

---

### `labeller.py`

Batch LLM labelling using vLLM with guided JSON decoding. Sends `title + body` to `Llama-3.3-70B-Instruct` and parses the response into a structured frame list.

**Features:**
- **Bucketing** — sorts articles by character length before batching to minimise padding waste
- **Chunking** — writes results in discrete chunks to avoid data loss on shared cluster jobs
- **Guided decoding** — constrains output to valid frame labels via JSON schema, eliminating parse failures

**Environment variables (all required):**

| Variable | Example | Description |
|----------|---------|-------------|
| `CUDA_VISIBLE_DEVICES` | `0,1` | GPU indices to use |
| `INPUT_CSV` | `clean.csv` | Preprocessed article CSV |
| `OUTPUT_CSV` | `labelled.csv` | Output path |
| `MODEL_ID` | `meta-llama/Llama-3.3-70B-Instruct` | vLLM model ID |
| `LANGUAGE` | `english` | Language key in `context.json` |
| `MAX_CHARS` | `8000` | Truncate article body beyond this many characters |
| `MAX_TOKENS` | `64` | Max tokens in the LLM response |

```bash
export CUDA_VISIBLE_DEVICES=0,1
export INPUT_CSV=clean.csv
export OUTPUT_CSV=labelled.csv
export MODEL_ID=meta-llama/Llama-3.3-70B-Instruct
export LANGUAGE=english
export MAX_CHARS=8000
export MAX_TOKENS=64

python labeller.py
```

Or via the provided job script:

```bash
chmod +x run_labelling.sh
./run_labelling.sh
```

Frame definitions and language-specific prompts live in `context.json`.

---

### `classifier.py`

Fine-tunes `XLM-RoBERTa-Longformer` on the LLM-generated labels. Multi-label classification — an article can carry more than one frame.

**Training:**

```python
from classifier import FrameClassifier

clf = FrameClassifier(model_id_or_path="xlm-roberta-longformer-base-4096")
clf.train("labelled.csv", output_dir="checkpoints/")
```

**Inference from a checkpoint:**

```python
from classifier import FrameClassifier

clf = FrameClassifier(model_id_or_path="checkpoints/checkpoint-2970")
texts = ["Title: Energy crisis\nBody: Prices are surging across Europe."]
print(clf.predict(texts))
# [['Economic Consequences', 'Attribution of Responsibility']]
```

**Explainability (SHAP):**

```python
import shap
from classifier import FrameClassifier

clf = FrameClassifier(model_id_or_path="checkpoints/checkpoint-2970")
shap_values = clf.explain_shap(["Title: Crisis\nBody: Health costs are rising."])
```

**Hyperparameter tuning** (wandb sweeps, Bayesian optimisation):

```bash
chmod +x run_sweep.sh
./run_sweep.sh   # torchrun wrapper around sweep.yaml
```

---

### `deployment_1.py`

Production inference wrapper (`Predictor` class) used by `backend/main.py`. Adds **Platt scaling calibration** on top of the raw classifier logits and optionally returns **attention-based word importance scores**.

```python
from deployment_1 import Predictor

calibrations = {
    'Conflict':               {'W': 1.0098, 'b': -0.1047},
    'Economic Consequences':  {'W': 0.6491, 'b': -1.2076},
    'Human Interest':         {'W': 0.6111, 'b': -0.2337},
    'Morality':               {'W': 1.0935, 'b':  1.7397},
    'Responsibility':         {'W': 0.5278, 'b': -0.6062},
}

predictor = Predictor(
    checkpoint_path="analysis/checkpoint-2970",
    calibrations=calibrations,
    device="cuda",
)

results = predictor.predict(
    ["Title: Floods\nBody: Rising seas threaten coastal towns."],
    threshold=0.5,
    explain=True,       # include attention word scores
)
# results[0] = {
#   "probabilities": {"Conflict": 0.12, "Human Interest": 0.71, ...},
#   "explanation": '{"3": 0.82, "7": 0.61, ...}'   ← word index → score
# }
```

**Calibration** applies per-label Platt scaling (`W * logit + b`) before sigmoid, correcting for class imbalance learned during training.

**Explanation** uses the final-layer CLS attention. Words whose attention score exceeds `mean + std` of the non-padding tokens are returned as a `{word_index: score}` JSON string. This feeds the `ExplainPanel` component in the frontend.

**Batch inference on a CSV:**

```bash
# Runs with the deployment calibrations and saves results to results_prediction.pkl
python deployment_1.py
# Edit CHECKPOINT_DIR and input CSV path at the bottom of the file before running
```

---

## File structure

```
backend/analysis/
├── preprocessor.py         # Data cleaning
├── labeller.py             # vLLM batch labelling
├── classifier.py           # XLM-RoBERTa fine-tuning + SHAP
├── deployment_1.py         # Calibrated inference (used by FastAPI)
├── context.json            # Frame definitions + prompts per language
├── run_labelling.sh        # Cluster job script for labeller
├── run_sweep.sh            # torchrun wrapper for hyperparameter sweep
├── sweep.yaml              # wandb sweep config
├── icr/
│   ├── pre_icr.py          # Inter-coder reliability before adjudication
│   └── post_icr.py         # Inter-coder reliability after adjudication
└── README.md               # This file
```

Model checkpoints (`checkpoint-*/`) are not committed to the repo. Store them outside the project directory or add them to a large-file store.

---

## Classifying the full database

`backend/classify_db.py` runs the frame and angle classifiers against every article in PostgreSQL and writes the probabilities back to both sets of columns.

```bash
# From backend/
python classify_db.py                   # all unclassified articles
python classify_db.py --limit 500       # first 500 (useful for testing)
python classify_db.py --force           # re-run already-classified rows
python classify_db.py --batch-size 16   # reduce if GPU memory is tight
python classify_db.py --dry-run         # report row count only, no writes
```

Default model paths are `../models/finalmodel` (frames) and `../models/finalangle` (angles), resolved relative to the project root. Override with env vars:

```bash
FRAME_MODEL_PATH=/path/to/frame_checkpoint \
ANGLE_MODEL_PATH=/path/to/angle_checkpoint \
python classify_db.py
```

Columns written per article: `frame_attribution`, `frame_human_interest`, `frame_conflict`, `frame_morality`, `frame_economic`, `explanation_frames`, `angle_health`, `angle_economics`, `angle_jobs`, `angle_politics`, `angle_geopolitics`, `angle_purchasing_power`, `explanation_angles`, `classified_at`.

---

## Inter-coder reliability

`icr/pre_icr.py` and `icr/post_icr.py` compute agreement statistics (Krippendorff's α, Cohen's κ) across human annotators before and after adjudication sessions. Run them against your annotation export CSV:

```bash
python icr/pre_icr.py  --input annotations_round1.csv
python icr/post_icr.py --input annotations_adjudicated.csv
```
