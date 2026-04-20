#random sampling of X articles
import numpy as np
import pandas as pd

labelled_articles = pd.read_csv("$HOME/qc/dataset1.csv")
sampled_rows = labelled_articles.sample(n=100, random_state=0)

articles = sampled_rows[["an","text"]] #article number as identifier
articles["frame_french"] = np.nan
articles.to_csv("$HOME/qc/sampled_articles.csv",index=False)