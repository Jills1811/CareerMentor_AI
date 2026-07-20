import sys
import os
from pathlib import Path

# Add the parent directory to sys.path to allow importing from models
sys.path.append(str(Path(__file__).parent))

from models.llm import generate_text

def main():
    prompt = "Explain AI in simple words"
    try:
        # Call the HuggingFace API using the logic defined in llm.py
        response_text = generate_text(prompt)
        # Print only the generated response
        print(response_text)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
