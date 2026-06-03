import pandas as pd
import os
import json
import codecs
import ast

#translate frames/angles into english, based on context.json
def translate_labels(labels, stream, language):
    if isinstance(labels,str):
        labels = ast.literal_eval(labels)
    with open('context.json', 'r', encoding='utf-8') as f:
        ctx = json.load(f)
    base_labels = ctx[stream]["english"]
    label_maps = {lang: {local: base_labels[i] for i, local in enumerate(labels)}
                  for lang, labels in ctx[stream].items()}

    translated = []
    for label in labels:
        if r"\u" in label: #encoding issues in French LLM labels because of accents
            label = codecs.decode(label, "unicode_escape")
        standardized_label = label_maps.get(language, {}).get(label, label)
        translated.append(standardized_label)
        
    return translated