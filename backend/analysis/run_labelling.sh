set -e

export CUDA_VISIBLE_DEVICES="0,1,2,3"
export VLLM_WORKER_MULTIPROC_METHOD="spawn"
export HF_HOME="$HOME"

export INPUT_CSV="$HOME/qc/dataset_clean.csv"
export OUTPUT_CSV="$HOME/qc/classified_results.csv"
export MODEL_ID="$HOME/hub/models--meta-llama--Llama-3.3-70B-Instruct/snapshots/6f6073b423013f6a7d4d9f39144961bfbfbc386b"
export LANGUAGE="french"

BUCKETS=(
    "8000 4096"
    "16000 8192"
    "32000 16384"
    "64000 32768"
    "128000 65536"
    "inf 131072")

for BUCKET in "${BUCKETS[@]}"; do
    read -r MAX_CHARS MAX_TOKENS <<< "$BUCKET"
    export MAX_CHARS
    export MAX_TOKENS
    python preprocessor.py
done