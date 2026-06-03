import torch
import pandas as pd
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification, set_seed
import json
from tqdm import tqdm

class Predictor:
    def __init__(self, checkpoint_path, device=None, calibrations=None):
        set_seed(0)
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(checkpoint_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(checkpoint_path, attn_implementation="eager")
        self.model.to(self.device)
        self.model.eval()
        self.id2label = self.model.config.id2label
        self.num_labels = len(self.id2label)
        
        self.is_calibrated = calibrations is not None
        if self.is_calibrated:
            W_array = torch.ones(self.num_labels, dtype=torch.float32)
            b_array = torch.zeros(self.num_labels, dtype=torch.float32)
            for idx, label in self.id2label.items():
                if label in calibrations:
                    W_array[idx] = calibrations[label]['W']
                    b_array[idx] = calibrations[label]['b']
            self.W_tensor = W_array.to(self.device)
            self.b_tensor = b_array.to(self.device)

    def predict(self, texts, threshold=0.5, batch_size=8, return_logits=False, explain=False):
        all_results = []
        texts = [str(t) for t in texts]

        with torch.no_grad():
            for i in tqdm(range(0, len(texts), batch_size), desc="Processing Batches", unit="batch"):
                batch_texts = texts[i : i + batch_size]
                
                inputs = self.tokenizer(batch_texts, padding=True, truncation=True, max_length=4096, return_tensors="pt").to(self.device)

                outputs = self.model(**inputs, output_attentions=explain)
                logits = outputs.logits
                
                if return_logits: #extracting logits only, needed for Platt scaling
                    for batch_idx in range(logits.shape[0]):
                        logit_dict = {self.id2label[idx]: float(logits[batch_idx][idx]) for idx in range(self.num_labels)}
                        all_results.append(logit_dict)
                    continue
                
                if self.is_calibrated:
                    scaled_logits = (logits * self.W_tensor) + self.b_tensor
                    probs = torch.sigmoid(scaled_logits)
                else: #angle model
                    probs = torch.sigmoid(logits)
                
                for batch_idx in range(probs.shape[0]):
                    # Return the exact calibrated floating-point values
                    result_dict = {"probabilities": {self.id2label[idx]: float(probs[batch_idx][idx]) for idx in range(self.num_labels)}}

                    if explain:
                        #only using CLS attention since it's the fastest and gives minimal explainability
                        last_layer_attention = outputs.attentions[-1]
                        cls_attention = last_layer_attention[batch_idx, :, 0, :].mean(dim=0)
                        
                        input_ids = inputs["input_ids"][batch_idx]
                        tokens = self.tokenizer.convert_ids_to_tokens(input_ids)
                        
                        #check average+std of attention, so to not attribute a score to every word
                        valid_scores = [cls_attention[i].item() for i, t in enumerate(tokens) 
                                        if t not in [self.tokenizer.cls_token, self.tokenizer.eos_token, self.tokenizer.pad_token]]
                        if valid_scores:
                            avg_score = sum(valid_scores) / len(valid_scores)
                            variance = sum([((x - avg_score) ** 2) for x in valid_scores]) / len(valid_scores)
                            attention_threshold = avg_score + (variance ** 0.5)
                        else:
                            attention_threshold = 1.0

                        scored_words = {}
                        word_idx = 0
                        current_word = ""
                        current_score = 0.0

                        for idx, token in enumerate(tokens):
                            if token in [self.tokenizer.cls_token, self.tokenizer.eos_token, self.tokenizer.pad_token]:
                                continue

                            score = cls_attention[idx].item()
                            #fix byte-pair encoding of RoBERTa and put together scores if word is split up
                            if token.startswith('Ġ') or token.startswith('▁'):
                                if current_word:
                                    if current_score > attention_threshold:
                                        scored_words[str(word_idx)] = round(current_score, 4)
                                    word_idx += 1
                                current_word = token.replace('Ġ', '').replace('▁', '')
                                current_score = score
                            else:
                                current_word += token.replace('▁', '')
                                current_score = max(current_score, score)

                        #indeces to access which word in the frontend to highlight
                        if current_word:
                            if current_score > attention_threshold:
                                scored_words[str(word_idx)] = round(current_score, 4)
                            word_idx += 1

                        result_dict["explanation"] = json.dumps(scored_words)
                        
                    all_results.append(result_dict)

        return all_results

if __name__ == "__main__":
    CHECKPOINT_DIR = "/models/frame_classifier/" #"/models/angle_classifier/"
    
    #output from last cell in Data Analysis notebook
    deployment_calibrations = {
    'Conflict': {'W': 1.1204, 'b': -0.2250},
    'Economic Consequences': {'W': 0.7453, 'b': -1.7384},
    'Human Interest': {'W': 0.6387, 'b': -0.5708},
    'Morality': {'W': 1.4947, 'b': 2.1579},
    'Responsibility': {'W': 0.4394, 'b': -0.2494}}

    #use deployment_calibrations = None for angle model!

    predictor = Predictor(checkpoint_path=CHECKPOINT_DIR, calibrations=None, device="cpu")

    df = pd.read_csv("french_filtered.csv")
    df["text"] = df["title"]+df["body"]
    texts = df["text"].tolist()

    import pickle

    results = predictor.predict(texts, batch_size=2, return_logits=False, explain=True)
    with open("datasets/attention/attention_frames.pkl","wb") as f:
        pickle.dump(results,f)