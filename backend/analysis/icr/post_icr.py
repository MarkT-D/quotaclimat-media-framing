import pandas as pd
import krippendorff
from sklearn.preprocessing import MultiLabelBinarizer

labelled_articles = pd.read_csv("$HOME/qc/classified_results.csv")[['an','frame_french']]
sampled_articles = pd.read_csv("$HOME/qc/sampled_articles.csv")[['an']]

reviewer1 = pd.read_csv("$HOME/qc/reviewer1.csv")[["an","frame_french"]]
reviewer2 = pd.read_csv("$HOME/qc/reviewer2.csv")[["an","frame_french"]]

#select frame_french labels of sampled_articles and merge with frame_french from reviewer 1 and 2, 
#so that the new dataframe has an, frame_french, frame_french1, frame_french2 as columns

icr_df = (sampled_df
    .merge(labelled_articles, on="an", how="left")
    .merge(reviewer1.rename(columns={"frame_french": "frame_french1"}), on="an", how="left")
    .merge(reviewer2.rename(columns={"frame_french": "frame_french2"}), on="an", how="left"))

icr_df.to_csv("$HOME/qc/icr_merged.csv", index=False)

def get_lists(series):
    #TODO
    return series.fillna("").apply(lambda x: [f.strip() for f in str(x).split(',') if f.strip()])

r1 = get_lists(icr_df['frame_french'])
r2 = get_lists(icr_df['frame_french1'])
r3 = get_lists(icr_df['frame_french2'])

mlb = MultiLabelBinarizer()
mlb.fit(pd.concat([r1, r2, r3]))

bin1 = mlb.transform(r1)
bin2 = mlb.transform(r2)
bin3 = mlb.transform(r3)

#alpha per frame
for i, frame in enumerate(mlb.classes_):
    matrix = [bin1[:, i], bin2[:, i], bin3[:, i]]
    alpha = krippendorff.alpha(reliability_data=matrix, level_of_measurement="nominal")
    print(f"{frame.ljust(25)}: {alpha:.3f}")