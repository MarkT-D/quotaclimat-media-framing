set -e

export LANGUAGE="french"
export HF_HOME="$HOME"
export WANDB_PROJECT="roberta-frame-classifier"
export WANDB_ENTITY="YOUR_WANDB_ENTITY"
export MODEL_ID="markussagen/xlm-roberta-longformer-base-4096"

OUTPUT=$(wandb sweep sweep.yaml 2>&1)
echo "$OUTPUT"
AGENT_PATH=$(echo "$OUTPUT" | grep "Run sweep agent with:" | awk '{print $NF}')

wandb agent "$AGENT_PATH"