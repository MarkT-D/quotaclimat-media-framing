import pandas as pd 

def clean_dataset(input_path, output_path):
    #remove duplicates, NaNs in title/body, unicode ids of whitespaces, filters by word count
    df = pd.read_csv(input_path)
    print("before:", len(df))
    
    df = df[df["duplicate_status"] != "DUP"]
    df = df.dropna(subset=["title", "body"])
    df['body'] = df['body'].str.replace('\xa0', ' ')
    df['word_count'] = df['body'].str.split().str.len()
    df = df[df["word_count"] > 100]
    df['char_length'] = df['title'].str.len() + df['body'].str.len()
    df['language'] = 'french'
    
    print("after:", len(df))
    df.to_csv(output_path, index=False)

if __name__ == "__main__":
    clean_dataset("$HOME/qc/dataset.csv","$HOME/qc/dataset_cleaned.csv")
