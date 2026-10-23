Pipeline for classifying climate news articles into frames and angles.
Uses `gpt-5-mini` to generate ground-truth labels, then distils them into `XLM-RoBERTa-Longformer` classifier.


Pipeline overview:
```
Articles (CSV)
      │
      ▼
labeller.py         ← LLM batch labelling
      │
      ▼
classifier.py       ← fine-tune XLM-RoBERTa on LLM labels
      │
      ▼
deployment.py       ← inference, with attention explanation
      │
      ▼
backend/main.py     ← FastAPI endpoint (/classify)
```

---

## Components

### `labeller.py`

Example for running:
`python --input datasets/raw/dutch.csv --output datasets/llm_labelled/dutch_frames.csv --language dutch --context_file context.json --model gpt5-mini --chunk_size 1000 --stream frame`


This is being run across all files in datasets/raw (so dutch.csv, french_filtered.csv, english.csv), for --stream frame and for --stream angle.

The language specific prompts for frames and angles, as well as JSON schema for guided decoding, are in /prompts.
context.json is used to translate the name of frames/angles into the different languages.

---

### `classifier.py`

Finetunes `XLM-RoBERTa-Longformer` (https://huggingface.co/markussagen/xlm-roberta-longformer-base-4096) on the LLM-generated labels, across languages.
Multilabel classification.

To run hyperparameter tuning with wandb, use run_sweep.sh:
```bash
chmod +x run_sweep.sh
./run_sweep.sh 
```

Note: this script was run twice, once with STREAM="frame" and once with STREAM="angle"

The model checkpoints are not committed to the repo. Store outside the project directory.

---

### `deployment.py`

Production inference wrapper (`Predictor` class) used by `backend/main.py`. Adds Platt scaling calibration on top of the raw classifier logits and optionally returns attention-based word importance scores.

When running .predict with return_logits=True, the raw logits only are returned, so that the calibration can be determined (see bottom of Data Analysis.ipynb).
In production, explain=True is always used.

Explanation uses final-layer CLS attention. Words whose attention score exceeds mean+std of tokens are returned as {word_index : score} JSON string, which feeds ExplainPanel component in the frontend.

CHECKPOINT_DIR is where the classifier.py stored the final hyperparameter-tuned model.

---

## `backend/classify_db.py`

This is used when a user uploads a database. Runs classifier against every article and writes probabilities to frame columns.
Use --limit n (to use first n for testing), run --force to rerun already classified.

Set `FRAME_MODEL_PATH` to override the default checkpoint location.

Columns written per article: `frame_attribution`, `frame_human_interest`, `frame_conflict`, `frame_morality`, `frame_economic`, `explanation_frames`, `classified_at`.
