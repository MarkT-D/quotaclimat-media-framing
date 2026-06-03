import os, json, ast

import pandas as pd
import torch
from scipy.special import expit
from sklearn.metrics import f1_score, precision_score, accuracy_score, roc_auc_score, recall_score
from sklearn.preprocessing import MultiLabelBinarizer
from datasets import Dataset, DatasetDict, concatenate_datasets
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments, set_seed, pipeline

from utils import translate_labels

#The average of f1 scores across the languages is used as evaluation metric for the wandb sweep, so this needs a custom evaluation
class MultiLangTrainer(Trainer):
    def evaluate(self, eval_dataset=None, ignore_keys=None, metric_key_prefix="eval"):
        metrics = super().evaluate(eval_dataset, ignore_keys, metric_key_prefix)
        
        if eval_dataset is None and isinstance(self.eval_dataset, dict):
            f1_scores = [v for k, v in metrics.items() if k.endswith("_f1_macro") and k.startswith(f"{metric_key_prefix}_")]      
            if f1_scores:
                mean_f1 = sum(f1_scores) / len(f1_scores)
                metrics[f"{metric_key_prefix}_overall_f1_macro"] = mean_f1
            
        return metrics

class Classifier:
    def __init__(self, model_id_or_path, languages, context_file="context.json", stream="frame"):
        set_seed(0)
        self.model_id_or_path = model_id_or_path
        self.languages = [l.strip() for l in languages.split(',')]
        self.stream = stream
        self.tokenizer = AutoTokenizer.from_pretrained(model_id_or_path)
        self.mlb = MultiLabelBinarizer()

        #get labels from context.json
        with open(context_file, 'r', encoding='utf-8') as f:
            ctx = json.load(f)
        self.mlb.fit([ctx[stream+"s"]["english"]])

        num_labels = len(self.mlb.classes_)

        self.model = AutoModelForSequenceClassification.from_pretrained(model_id_or_path,
            num_labels=num_labels, problem_type="multi_label_classification", ignore_mismatched_sizes=True)

        self.model.config.id2label = {i: label for i, label in enumerate(self.mlb.classes_)}
        self.model.config.label2id = {label: i for i, label in enumerate(self.mlb.classes_)}

    @staticmethod
    def compute_metrics(eval_pred):
        logits, labels = eval_pred
        probs = expit(logits)
        preds = (probs > 0.5).astype(int)

        try:
            roc_auc = roc_auc_score(labels, probs, average='macro')
        except ValueError:
            roc_auc = 0.0

        return {"f1_macro": f1_score(labels, preds, average='macro', zero_division=0),
                "precision_macro": precision_score(labels, preds, average='macro', zero_division=0),
                "accuracy_exact": accuracy_score(labels, preds),
                "roc_auc_macro": roc_auc,
                "balanced_accuracy_macro": recall_score(labels, preds, average='macro', zero_division=0)}

    def prepare_data(self):
        all_dfs = {}
        for lang in self.languages:
            #prepare data and translate
            df = pd.read_csv(f"labelled_{self.stream}_{lang}.csv")[["title", "body", self.stream+"s"]].dropna()
            df["text"] = "Title: " + df["title"].astype(str) + "\nBody: " + df["body"].astype(str)

            df["frame_list"] = df[self.stream+"s"].apply(lambda x: translate_labels(x, self.stream+"s", lang))
            df["labels"] = self.mlb.transform(df["frame_list"]).astype(float).tolist()
            all_dfs[lang] = df

        train_ds_list, val_ds_list, test_ds_list = [], [], []
        eval_datasets, test_datasets = {}, {}
        
        def tokenize(batch):
            return self.tokenizer(batch["text"], padding="max_length", truncation=True, max_length=4096)

        for lang, df in all_dfs.items():
            ds = Dataset.from_pandas(df[["text", "labels"]])
            if "__index_level_0__" in ds.column_names:
                ds = ds.remove_columns(["__index_level_0__"])

            #0.8/0.1/0.1 split
            train_test = ds.train_test_split(test_size=0.2, seed=0)
            val_test = train_test['test'].train_test_split(test_size=0.5, seed=0)

            ds_dict = DatasetDict({'train': train_test['train'], 'val': val_test['train'], 'test': val_test['test']})
            ds_dict = ds_dict.map(tokenize, batched=True, remove_columns=["text"])

            train_ds_list.append(ds_dict["train"])
            eval_datasets[lang] = ds_dict["val"]
            test_datasets[lang] = ds_dict["test"]

        train_dataset = concatenate_datasets(train_ds_list)
        return train_dataset, eval_datasets, test_datasets

    def train(self, train_ds, eval_datasets, test_datasets, training_args):
        trainer = MultiLangTrainer(model=self.model, args=training_args,
                                   train_dataset=train_ds, eval_dataset=eval_datasets, 
                                   processing_class=self.tokenizer, compute_metrics=self.compute_metrics)

        trainer.train()

        test_f1_scores = []
        for name, dataset in test_datasets.items():
            test_results = trainer.evaluate(dataset, metric_key_prefix=f"test_{name}")
            
            if f"test_{name}_f1_macro" in test_results:
                test_f1_scores.append(test_results[f"test_{name}_f1_macro"])
            
            if trainer.is_world_process_zero(): #log result only from one GPU
                import wandb
                if wandb.run is not None:
                    wandb.log(test_results)

        if trainer.is_world_process_zero() and test_f1_scores:
            test_overall_f1 = sum(test_f1_scores) / len(test_f1_scores)
            import wandb
            if wandb.run is not None:
                wandb.log({"test_overall_f1_macro": test_overall_f1})

        if trainer.is_world_process_zero(): #store best model
            os.makedirs(training_args.output_dir, exist_ok=True)
            trainer.save_model(training_args.output_dir) 
            with open(os.path.join(training_args.output_dir, "label_encoder.json"), "w") as f:
                json.dump(list(self.mlb.classes_), f)

        return trainer

if __name__ == "__main__":
    from transformers import HfArgumentParser

    parser = HfArgumentParser((TrainingArguments,))
    training_args, _ = parser.parse_args_into_dataclasses(return_remaining_strings=True)

    classifier = Classifier(model_id_or_path=os.environ["MODEL_ID"], languages=os.environ["LANGUAGES"], stream=os.environ["STREAM"])

    train_ds, eval_datasets, test_datasets = classifier.prepare_data()
    classifier.train(train_ds, eval_datasets, test_datasets, training_args)