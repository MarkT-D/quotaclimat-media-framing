import os
import json
import time
import argparse
import pandas as pd
from openai import OpenAI

#load prompt, json schema, and how the term title/body is called in that language from context.json
def load_resources(language, context_file, stream="frame"):
    with open(context_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    labels = data[stream+"s"][language]
    prefix_data = data["prefix"][language]
    prefixes = {"title": prefix_data["title"], "body": prefix_data["body"]}
    
    with open(f"prompts/prompt_{stream}_{language}.txt", "r", encoding="utf-8") as f:
        system_prompt = f.read()
        
    with open(f"prompts/prompt_{stream}_schema_{language}.txt", "r", encoding="utf-8") as f:
        schema_str = f.read()
        
    schema_str = schema_str.replace("[labels]", json.dumps(labels))
    schema_dict = json.loads(schema_str)
    return system_prompt, labels, prefixes, schema_dict

#batch requests to be uploaded to the API
def create_jsonl_chunk(df, filename, system_prompt, schema, model, prefixes):
    with open(filename, "w", encoding="utf-8") as f:
        for _, row in df.iterrows():
            content = f"{prefixes['title']}: {row['title']}\n{prefixes['body']}: {row['body']}"
            req = {
                "custom_id": str(row['an']),
                "method": "POST",
                "url": "/v1/chat/completions",
                "body": {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": content}
                    ],
                    "response_format": schema
                }
            }
            f.write(json.dumps(req) + "\n")

#store response
def process_completed_batch(client, batch_id, output_csv, stream):
    stream += 's' #plural
    job = client.batches.retrieve(batch_id)
    file_response = client.files.content(job.output_file_id)
    results = []
    
    for line in file_response.text.strip().split('\n'):
        if not line: continue
        res = json.loads(line)
        an = res['custom_id']
                    
        content_str = res['response']['body']['choices'][0]['message']['content']
        data = json.loads(content_str)
        
        analyse_text = " | ".join([f"{k}: {v}" for k, v in data.items() if k.startswith("eval_")])
        results.append({'an': an, 'analyse': analyse_text, stream: json.dumps(data[stream])})
        
    res_df = pd.DataFrame(results)
    
    if os.path.exists(output_csv):
        res_df.to_csv(output_csv, mode='a', header=False, index=False)
    else:
        res_df.to_csv(output_csv, index=False)

def run_automated_pipeline(client, args):
    system_prompt, labels, prefixes, schema = load_resources(args.language, args.context_file, args.stream)
    
    df = pd.read_csv(args.input)
    
    if os.path.exists(args.output):
        done_df = pd.read_csv(args.output)
        done_ids = set(done_df['an'].astype(str))
        df = df[~df['an'].astype(str).isin(done_ids)]
        print("adding on to existing file. Remaining articles: ",len(df))
    
    if df.empty:
        print("all done")
        return

    total_chunks = (len(df) // args.chunk_size) + 1
    for i in range(total_chunks):
        chunk_df = df.iloc[i * args.chunk_size : (i + 1) * args.chunk_size]
        if chunk_df.empty: break
        print(f"running chunk {i+1} out of {total_chunks}")
        jsonl_file = f"temp_chunk_{i+1}.jsonl"
        create_jsonl_chunk(chunk_df, jsonl_file, system_prompt, schema, args.model, prefixes)
        
        with open(jsonl_file, "rb") as f:
            batch_input = client.files.create(file=f, purpose="batch")
        batch_job = client.batches.create(input_file_id=batch_input.id, endpoint="/v1/chat/completions", completion_window="24h")
        print("submitted batch. waiting...")
        
        while True:
            status = client.batches.retrieve(batch_job.id).status
            if status == "completed":
                print("Batch completed.")
                process_completed_batch(client, batch_job.id, args.output, args.stream)
                os.remove(jsonl_file) 
                break
            
            print(".", end="", flush=True)
            time.sleep(120)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="datasets/raw/dutch.csv")
    parser.add_argument("--output", default="datasets/llm_labelled/dutch_frames.csv")
    parser.add_argument("--language", default="dutch")
    parser.add_argument("--context_file", default="context.json")
    parser.add_argument("--model", default="gpt-5-mini") 
    parser.add_argument("--chunk_size", type=int, default=1000)
    parser.add_argument("--stream", type=str, default="frame") #or angle
    
    args = parser.parse_args()
    client = OpenAI(api_key="secret ;-)")
    run_automated_pipeline(client, args)


if __name__ == "__main__":
    main()