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
You are an expert career advisor and technical mentor.

Your task is to analyze a candidate based on:

1. Resume analysis
2. ATS optimization feedback
3. Interview evaluation results

Data:
\"\"\"
{data}
\"\"\"

Instructions:

- Provide a clear final assessment of the candidate
- Identify skill gaps
- Highlight strengths
- Identify weak areas
- Suggest what the candidate should learn next
- Recommend projects to improve profile
- Provide a step-by-step career roadmap
- Estimate confidence level (Beginner / Intermediate / Advanced)

Return strictly in JSON:

{{
  "final_assessment": "Short summary of candidate level",
  "skill_gaps": ["List of missing or weak skills"],
  "strengths": ["Key strengths of the candidate"],
  "weak_areas": ["Areas that need improvement"],
  "learning_recommendations": ["Topics and resources to study next"],
  "project_suggestions": ["Projects to build for portfolio improvement"],
  "career_roadmap": ["Step 1...", "Step 2...", "Step 3..."],
  "confidence_level": "Beginner / Intermediate / Advanced"
}}

Rules:
- No explanation outside JSON
- Be practical and realistic
- Give actionable advice
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
    print("[FEEDBACK][WARNING] Could not parse LLM response as JSON. Returning raw text.")
    return {"raw_response": response}


# ──────────────────────────────────────────────
# Feedback Agent
# ──────────────────────────────────────────────

def feedback_agent(input_data) -> dict:
    """
    Takes combined outputs from Resume, ATS, and Evaluator agents,
    and generates final career guidance with actionable recommendations.
    """
    print("[FEEDBACK] Generating final career guidance...")

    # Step 1: Build prompt
    prompt = PROMPT_TEMPLATE.format(
        data=json.dumps(input_data, indent=2)
    )

    print("[FEEDBACK] Sending request to LLM...")

    # Step 2: Call LLM
    response = generate_text(prompt)

    print(f"[FEEDBACK] Received response of length: {len(response)}")

    print("[FEEDBACK] Parsing response...")

    # Step 3: Parse JSON
    parsed = parse_json(response)

    print("[FEEDBACK] Done.")

    return parsed
