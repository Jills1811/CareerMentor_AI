import json
import re
import sys
import logging
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from models.llm import generate_text

logger = logging.getLogger("EvaluatorAgent")

PROMPT_TEMPLATE = """
You are a senior technical interviewer. Evaluate each candidate answer individually and return strictly valid JSON.

Interview Data:
\"\"\"
{data}
\"\"\"

Return strictly in this JSON format:
{{
  "overall_score": 7.5,
  "question_wise_feedback": [
    {{
      "question": "Question text",
      "score": 7.5,
      "strengths": ["Specific point candidate got right"],
      "mistakes": ["Specific technical concept missed or incorrect"],
      "improvements": ["Specific improvement recommendation"],
      "expected_answer": "Summary of ideal answer"
    }}
  ],
  "overall_strengths": ["Key overall strength"],
  "overall_weaknesses": ["Key overall gap"],
  "final_suggestions": ["Actionable preparation step"]
}}

Rules:
- Output ONLY valid JSON. No conversational intro/outro.
- Give a realistic score (0 to 10) for each question based on technical accuracy, not answer length.
"""

def parse_json(response: str) -> dict:
    if not response or not response.strip():
        return {}

    text = response.strip()

    # 1. Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # 2. Extract from markdown code fence
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if fence_match:
        try:
            return json.loads(fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # 3. Extract outermost curly braces
    brace_match = re.search(r"\{[\s\S]*\}", text)
    if brace_match:
        try:
            return json.loads(brace_match.group(0).strip())
        except json.JSONDecodeError:
            pass

    print(f"[EVALUATOR][ERROR] Failed to parse JSON. Raw LLM response:\n{text[:500]}...")
    return {}

def evaluator_agent(input_data) -> dict:
    print("[EVALUATOR] Evaluating interview answers...")
    prompt = PROMPT_TEMPLATE.format(data=json.dumps(input_data, indent=2))
    response = generate_text(prompt)
    print(f"[EVALUATOR] Received response of length: {len(response)}")
    parsed = parse_json(response)
    return parsed