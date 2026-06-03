set -e

export LANGUAGES="french,english,dutch"
export STREAM="frame" #or angle
export HF_HOME="$HOME"
export WANDB_PROJECT="roberta-frame-classifier"
export WANDB_ENTITY="YOUR_WANDB_ENTITY"
export MODEL_ID="markussagen/xlm-roberta-longformer-base-4096"
export CUDA_VISIBLE_DEVICES=0,1,2,3

export TMPDIR=$HOME/quota-climate/backend/analysis/local_tmp
export TEMP=$HOME/quota-climate/backend/analysis/local_tmp
export TMP=$HOME/quota-climate/backend/analysis/local_tmp
export WANDB_DIR="$HOME/quota-climate/backend/analysis/wandb_cache"
export WANDB_CONFIG_DIR="$HOME/quota-climate/backend/analysis/wandb_cache"
export WANDB_CACHE_DIR="$HOME/quota-climate/backend/analysis/wandb_cache"

#create sweep, then directly run sweep agent
OUTPUT=$(wandb sweep sweep.yaml 2>&1)
echo "$OUTPUT"
AGENT_PATH=$(echo "$OUTPUT" | grep "Run sweep agent with:" | awk '{print $NF}')

wandb agent "$AGENT_PATH" --count 10