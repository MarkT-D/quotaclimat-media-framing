"""
BERT-based article classifier.
Will classify articles into sectors, crisis domains, stages, and frames
as defined in lib/mockData.ts.

"""
import os
import ast
import json
import torch
import pandas as pd
from datasets import Dataset, DatasetDict
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.metrics import f1_score, precision_score, accuracy_score, roc_auc_score, recall_score
from scipy.special import expit
from transformers import (AutoTokenizer, AutoModelForSequenceClassification, 
    TrainingArguments, Trainer,
    pipeline,set_seed)
import shap


class FrameClassifier:
    def __init__(self, model_id_or_path, language="french"):
        set_seed(0)
        self.model_id_or_path = model_id_or_path
        self.language = language
        self.tokenizer = AutoTokenizer.from_pretrained(model_id_or_path)
        self.mlb = MultiLabelBinarizer()
        
        #check for pre trained model
        self.is_trained = os.path.exists(os.path.join(model_id_or_path, "label_encoder.json"))
        
        if self.is_trained:
            with open(os.path.join(model_id_or_path, "label_encoder.json"), "r") as f:
                classes = json.load(f)
            self.mlb.fit([classes])
            self.model = AutoModelForSequenceClassification.from_pretrained(model_id_or_path, problem_type="multi_label_classification")
        else:
            self.model = AutoModelForSequenceClassification.from_pretrained(model_id_or_path, problem_type="multi_label_classification")

    @staticmethod
    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        probs = expit(logits)
        preds = (probs > 0.5).astype(int)
        
        try:
            roc_auc = roc_auc_score(labels, probs, average='macro')
        except ValueError:
            roc_auc = 0.0

        return {
            "f1_macro": f1_score(labels, preds, average='macro', zero_division=0),
            "precision_macro": precision_score(labels, preds, average='macro', zero_division=0),
            "accuracy_exact": accuracy_score(labels, preds),
            "roc_auc_macro": roc_auc,
            "balanced_accuracy_macro": recall_score(labels, preds, average='macro', zero_division=0)
        }

    def prepare_data(self, input_csv):
        # TODO move partially to preprocessor
        frame_col = f"frame_{self.language}"
        df = pd.read_csv(input_csv)[["title", "body", frame_col]].dropna()
        df["text"] = "Title: " + df["title"].astype(str) + "\nBody: " + df["body"].astype(str)
        #turn string of list into actual list:
        df["frame_list"] = df[frame_col].apply(lambda x: ast.literal_eval(x) if pd.notna(x) and str(x).strip() != "" else [])
        df["labels"] = self.mlb.fit_transform(df["frame_list"]).astype(float).tolist()
        
        if not self.is_trained:
            self.model.config.num_labels = len(self.mlb.classes_)
            self.model.config.id2label = {i: label for i, label in enumerate(self.mlb.classes_)}
            self.model.config.label2id = {label: i for i, label in enumerate(self.mlb.classes_)}

        ds_full = Dataset.from_pandas(df[["text", "labels"]])
        if "__index_level_0__" in ds_full.column_names:
            ds_full = ds_full.remove_columns(["__index_level_0__"])

        #0.8/0.1/0.1 split
        train_test = ds_full.train_test_split(test_size=0.2, seed=0)
        val_test = train_test['test'].train_test_split(test_size=0.5, seed=0)
        ds = DatasetDict({'train': train_test['train'], 'val': val_test['train'], 'test': val_test['test']})

        def tokenize(batch):
            return self.tokenizer(batch["text"], padding="max_length", truncation=True, max_length=4096)

        return ds.map(tokenize, batched=True, remove_columns=["text"])

    def train(self, ds, training_args):
        trainer = Trainer(model=self.model, args=training_args,
            train_dataset=ds["train"], eval_dataset=ds["val"],
            processing_class=self.tokenizer, compute_metrics=self.compute_metrics)
        
        trainer.train()

        if trainer.is_world_process_zero():
            import wandb
            test_results = trainer.evaluate(ds["test"], metric_key_prefix="test")
            wandb.log(test_results)
            
            os.makedirs(training_args.output_dir, exist_ok=True)
            with open(os.path.join(training_args.output_dir, "label_encoder.json"), "w") as f:
                json.dump(list(self.mlb.classes_), f)
                
        return trainer

    def predict(self, texts, threshold=0.5):
        pipe = pipeline("text-classification", model=self.model, tokenizer=self.tokenizer, 
            device=0 if torch.cuda.is_available() else -1,
            top_k=None )
        raw_preds = pipe(texts, padding="max_length", truncation=True, max_length=4096)
        
        results = []
        for pred in raw_preds:
            frames = [p['label'] for p in pred if p['score'] >= threshold]
            results.append(frames)
        return results

    def explain_shap(self, texts):
        pipe = pipeline("text-classification", 
            model=self.model, tokenizer=self.tokenizer, 
            return_all_scores=True, 
            device=0 if torch.cuda.is_available() else -1)

        explainer = shap.Explainer(pipe)
        #TODO add process for showing highlighted text
        return explainer(texts)


if __name__ == "__main__":
    from transformers import HfArgumentParser, TrainingArguments
    import os

    parser = HfArgumentParser((TrainingArguments,))
    training_args, _ = parser.parse_args_into_dataclasses(return_remaining_strings=True)

    classifier = FrameClassifier(model_id_or_path=os.environ["MODEL_ID"], language=os.environ["LANGUAGE"])
    
    ds = classifier.prepare_data(os.environ["INPUT_CSV"])
    classifier.train(ds, training_args)