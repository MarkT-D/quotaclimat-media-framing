import pandas as pd 

def clean_dataset(input_path, output_path, min_article_length=1000):
    df = pd.read_csv(input_path) #TODO
    df['char_length'] = df['body'].astype(str).str.len()
    df = df[df['char_length'] > min_article_length]
    df['body'] = df['body'].replace('\xa0',' ')
    #TODO additional filters!

    df.to_csv(output_path)

if __name__ == "__main__":
    clean_dataset("$HOME/qc/dataset1.csv","$HOME/qc/dataset_clean.csv")