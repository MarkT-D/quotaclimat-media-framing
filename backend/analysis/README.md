# Media Framing Classification Pipeline
This folder contains the data processing, labelling, and model training pipeline for the framing classifier.
It uses `Llama-3.3-70B-Instruct` for the labelling with `vLLM`, and `XLM-RoBERTa-Longformer` for distillation.


## Pipeline Components

### `preprocessor.py`
- cleans initial dataset
- could be extended for all incoming data


### `labeller.py`
Optimised, batch-processing script for generating groud-truth labels using `vLLM` and guided JSON decoding.
* Bucketing: Sorts articles by character length to prevent short articles from being padded to maximum length of longest article in the batch
* Chunking: processes and writes  data in discrete chunks to prevent data loss, since running this on a shared cluster.
* Architecture: explicitly procedural script (instead of OOP) for smaller overhead and better control when running on cluster

### `classifier.py`
Roberta framing classifier. Includes tokeniser, model training, metrics, inference, and SHAP.

#### Inference
Load a fine-tuned model checkpoint to predict frames on unseen data.

```python
from classifier import FrameClassifier

classifier = FrameClassifier(model_id_or_path="$HOME/roberta_frame_classifier/best_model")

texts = ["Title: Crise de l'énergie\nBody: Les prix explosent."]
predictions = classifier.predict(texts)

print(predictions)
# [['Économie', "Pouvoir d'achat"]]
```

#### Explainability (SHAP)

```python
import shap
from classifier import FrameClassifier

classifier = FrameClassifier(model_id_or_path="$HOME/roberta_frame_classifier/best_model")
text = "Title: Crise\nBody: La santé coûte cher."

shap_values = classifier.explain_shap([text])
```

#### Hyperparameter tuning
uses wandb sweeps, because of the advanced logging and allows for bayesian optimisation.
Uses bash script for better torchrun handling on cluster.
Run with:
```bash
chmod +x run_sweep.sh
./run_sweep.sh
```
