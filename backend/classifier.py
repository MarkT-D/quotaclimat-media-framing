"""
BERT-based article classifier.
Will classify articles into sectors, crisis domains, stages, and frames
as defined in lib/mockData.ts.
"""


class ArticleClassifier:
    def __init__(self, model_name: str = "bert-base-uncased"):
        self.model_name = model_name
        self.model = None  # TODO: load model

    def load(self):
        # TODO: load HuggingFace model + tokenizer
        pass

    def classify(self, text: str) -> dict:
        # TODO: return sector, crisis_domain, stage, frame scores
        raise NotImplementedError
