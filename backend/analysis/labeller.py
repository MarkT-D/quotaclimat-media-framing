import os
import re
import json
import pandas as pd
from vllm import LLM, SamplingParams
from vllm.sampling_params import GuidedDecodingParams
from transformers import AutoTokenizer
from tqdm import tqdm

#needed for competability between transformers and vLLM
try:
    from transformers.tokenization_utils_fast import TokenizersBackend
    if not hasattr(TokenizersBackend, 'all_special_tokens_extended'):
        TokenizersBackend.all_special_tokens_extended = property(lambda self: [])
except ImportError:
    pass

#generates prompts for a chunk
def generate_prompts(chunk, system_prompt, tokenizer):
    prompts = []
    for i, row in chunk.iterrows():
        body_text = str(row['body'])
        messages = [{"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Title: {row['title']}\nBody: {body_text}"}]
        prompts.append(tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True))

    return prompts

def main():
    num_gpus = len(os.environ["CUDA_VISIBLE_DEVICES"].split(","))
    input_csv = os.environ["INPUT_CSV"]
    output_csv = os.environ["OUTPUT_CSV"]
    model_id = os.environ["MODEL_ID"]
    language = os.environ["LANGUAGE"]
    max_chars = float(os.environ["MAX_CHARS"])
    max_tokens = int(os.environ["MAX_TOKENS"])

    chunk_size = 100

    #load frames and prompts for specific languages
    with open("context.json", "r", encoding="utf-8") as f:
        context = json.load(f)
    frames_list = context["frames"][language]
    frames_english = context["frames"]["english"]
    translate_map = dict(zip(frames_list, frames_english))
    frames_str = ", ".join(frames_list)
    system_prompt = context["prompts"][language].replace('[CAT]', frames_str)

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    dynamic_max_tokens = len(tokenizer(frames_str)["input_ids"]) + 30 #minimise output tokens

    #schema for output
    json_schema = {
        "type": "object",
        "properties": {
            "frames": {
                "type": "array",
                "items": {"type": "string", "enum": frames_list},
                "uniqueItems": True 
            }
        },
        "required": ["frames"],
        "additionalProperties": False}

    guided_params = GuidedDecodingParams(json=json_schema)
    sampling_params = SamplingParams(temperature=0.0, max_tokens=dynamic_max_tokens, guided_decoding=guided_params)

    df = pd.read_csv(input_csv, nrows=4000) #TODO
    df = df.sort_values('char_length')

    #find existing checkpoint to resume
    if os.path.exists(output_csv):
        processed_titles = set(pd.read_csv(output_csv, usecols=['title'])['title'])
        df = df[~df['title'].isin(processed_titles)]
        print(f"Resuming: {len(df)} articles remaining.")
    else:
        print(f"Starting fresh run with {len(df)} articles.")

    if df.empty:
        print("Finished. All data processed.")
        return

    bucket_df = df[df['char_length'] <= max_chars].copy()
    
    if not bucket_df.empty:
        print(f"--- Bucket (Max Chars: {max_chars}, Model Len: {max_tokens}) | Articles: {len(bucket_df)} ---")
        
        llm = LLM(model=model_id, tensor_parallel_size=num_gpus, 
            dtype="bfloat16", max_model_len=max_tokens, 
            enforce_eager=True, #needed for this cluster / no CUDA graphs
            trust_remote_code=True, 
            enable_prefix_caching=True, enable_chunked_prefill=True)

        for i in tqdm(range(0, len(bucket_df), chunk_size), desc=f"Processing Bucket {max_chars}"):
            chunk = bucket_df.iloc[i : i + chunk_size].copy()
            
            prompts = generate_prompts(chunk, system_prompt, tokenizer)
            outputs = llm.generate(prompts, sampling_params, use_tqdm=False)

            parsed_frames = []
            for out in outputs:
                raw_text = out.outputs[0].text.strip()
                try:
                    data = json.loads(raw_text)
                    #remove duplicates
                    parsed_frames.append(list(dict.fromkeys(data.get("frames", []))))
                except (json.JSONDecodeError, AttributeError):
                    #in case of nans
                    parsed_frames.append([])
                    
            chunk[f"frame_{language}"] = parsed_frames
            chunk["frame_english"] = chunk[f"frame_{language}"].apply(
                lambda frames: [translate_map[f] for f in frames])
            
            write_header = not os.path.exists(output_csv) #header only for new file
            chunk.drop(columns=['char_length']).to_csv(output_csv, mode='a', index=False, header=write_header)
            

if __name__ == "__main__":
    main()