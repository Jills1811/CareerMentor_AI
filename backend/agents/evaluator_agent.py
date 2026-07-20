import json
import sys
from pathlib import Path

# Allow imports from the backend root (parent of agents/)
sys.path.append(str(Path(__file__).resolve().parent.parent))
from models.llm import generate_text


# ──────────────────────────────────────────────
# Prompt Template
# ──────────────────────────────────────────────

PROMPT_TEMPLATE = """
You are a senior technical interviewer.

Your task is to evaluate a candidate's interview answers.

For each question:

- Evaluate the answer
- Give a score out of 10
- Identify strengths
- Identify mistakes
- Suggest improvements

Also:

- Provide overall feedback across all answers
- Calculate overall score (average of all individual scores)

Interview Data:
\"\"\"
{data}
\"\"\"

Return strictly in JSON:

{{
  "overall_score": number,
  "question_wise_feedback": [
    {{
      "question": "...",
      "score": number,
      "strengths": ["..."],
      "mistakes": ["..."],
      "improvements": ["..."]
    }}
  ],
  "overall_strengths": ["..."],
  "overall_weaknesses": ["..."],
  "final_suggestions": ["..."]
}}

Rules:
- No explanation outside JSON
- Be strict but constructive
- Score realistically
- Ensure valid JSON format
"""


# ──────────────────────────────────────────────
# JSON Parser
# ──────────────────────────────────────────────

def parse_json(response: str) -> dict:
    """
    Attempts to extract valid JSON from the LLM response.
    Handles markdown code fences and partial JSON blocks.
    """
    text = response.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    # Try parsing directly
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fallback: find the first { … } block in the response
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            pass

    # If all parsing fails, return the raw text wrapped in a dict
    print("[EVALUATOR][WARNING] Could not parse LLM response as JSON. Returning raw text.")
    return {"raw_response": response}


# ──────────────────────────────────────────────
# Evaluator Agent
# ──────────────────────────────────────────────

def evaluator_agent(input_data) -> dict:
    """
    Takes interview Q&A pairs from the Interviewer Agent,
    evaluates each answer, assigns scores, and returns
    structured evaluation feedback.
    """
    print("[EVALUATOR] Evaluating interview answers...")

    # Step 1: Build prompt
    prompt = PROMPT_TEMPLATE.format(
        data=json.dumps(input_data, indent=2)
    )

    print("[EVALUATOR] Sending request to LLM...")

    # Step 2: Call LLM
    response = generate_text(prompt)

    print(f"[EVALUATOR] Received response of length: {len(response)}")

    print("[EVALUATOR] Parsing response...")

    # Step 3: Parse JSON
    parsed = parse_json(response)

    print("[EVALUATOR] Evaluation completed.")

    return parsed
