import json
import sys
from pathlib import Path

# Allow imports from the backend root (parent of agents/)
sys.path.append(str(Path(__file__).resolve().parent.parent))
from models.llm import generate_text


# ──────────────────────────────────────────────
# Prompt Template
# ──────────────────────────────────────────────

ATS_PROMPT_TEMPLATE = """
You are an expert ATS (Applicant Tracking System) optimizer and HR specialist.

Your task is to analyze the following structured resume data and optimize it for ATS systems.

Resume Data:
\"\"\"
{data}
\"\"\"

Instructions:

- Identify missing keywords relevant to the candidate's domain.
- Suggest improvements to make the resume more ATS-friendly.
- Provide an ATS-optimized professional summary.
- Estimate an ATS score out of 100.
- Analyze keyword density and formatting issues.

Return the output strictly in the following JSON format:

{{
  "missing_keywords": ["List of important ATS keywords missing"],
  "improvements": ["List of actionable improvements"],
  "optimized_summary": "A strong ATS-friendly professional summary",
  "ats_score": "Score out of 100",
  "keyword_density_feedback": "Analysis of keyword usage",
  "formatting_feedback": "Feedback on resume formatting for ATS"
}}

Rules:
- Do not return anything except JSON.
- Ensure valid JSON format.
"""


# ──────────────────────────────────────────────
# JSON Parser (handles markdown fences, etc.)
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
    print("[ATS][WARNING] Could not parse LLM response as JSON. Returning raw text.")
    return {"raw_response": response}


# ──────────────────────────────────────────────
# ATS Agent
# ──────────────────────────────────────────────

def ats_agent(input_data) -> dict:
    """
    Takes the structured resume analysis dict (from resume_agent)
    and returns ATS optimization recommendations.
    """
    print("[ATS] Building prompt...")

    # Step 1: Build prompt
    prompt = ATS_PROMPT_TEMPLATE.format(data=json.dumps(input_data, indent=2))

    print("[ATS] Sending request to LLM...")

    # Step 2: Call LLM
    response = generate_text(prompt)

    print(f"[ATS] Received response of length: {len(response)}")

    print("[ATS] Parsing JSON...")

    # Step 3: Parse JSON
    parsed = parse_json(response)

    print("[ATS] Done.")

    # Step 4: Return
    return parsed
