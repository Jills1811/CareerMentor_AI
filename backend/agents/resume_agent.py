import json
import sys
from pathlib import Path

from PyPDF2 import PdfReader

# Allow imports from the backend root (parent of agents/)
sys.path.append(str(Path(__file__).resolve().parent.parent))
from models.llm import generate_text


# ──────────────────────────────────────────────
# 1. PDF Text Extraction
# ──────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> str:
    """
    Opens a PDF file, loops through every page,
    extracts text, and returns the combined string.
    """
    try:
        reader = PdfReader(file_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"Resume file not found: {file_path}")
    except Exception as e:
        raise RuntimeError(f"Failed to read PDF: {e}")

    pages_text = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text()
        if text:
            pages_text.append(text)
        else:
            print(f"[WARNING] Page {page_number} returned no text (may be image-based).")

    if not pages_text:
        raise ValueError("The PDF has no extractable text. It may be a scanned/image-based resume.")

    combined_text = "\n".join(pages_text)
    print(f"[INFO] Extracted {len(combined_text)} characters from {len(reader.pages)} page(s).")
    return combined_text


# ──────────────────────────────────────────────
# 2. Resume Analysis via LLM
# ──────────────────────────────────────────────

RESUME_ANALYSIS_PROMPT = """
You are an expert resume analyzer and career advisor.

Your task is to carefully analyze the following resume text and return a structured analysis.

Resume:
\"\"\"
{resume_text}
\"\"\"

Instructions:
- Extract key information from the resume.
- Be precise and professional.
- Do NOT add any extra explanation outside the required format.

Return the output strictly in the following JSON format:

{{
  "name": "Candidate full name (if available)",
  "email": "Candidate email (if available)",
  "skills": ["List of technical and soft skills"],
  "education": ["List education details"],
  "experience": ["List work experience"],
  "projects": ["List major projects"],
  "strengths": ["Key strengths of candidate"],
  "weaknesses": ["Possible weaknesses or missing areas"],
  "suggestions": ["Actionable improvements for candidate"]
}}

Rules:
- If any field is missing, return an empty list [] or empty string "".
- Do not return anything except JSON.
- Ensure valid JSON format.
"""


def analyze_resume(file_path: str) -> dict:
    """
    End-to-end resume analysis:
      1. Extract text from PDF
      2. Build the analysis prompt
      3. Call the LLM
      4. Parse the JSON response
      5. Return a structured dictionary
    """
    # Step 1 — Extract text from the PDF
    print(f"\n[STEP 1] Extracting text from: {file_path}")
    resume_text = extract_text_from_pdf(file_path)

    # Step 2 — Build the prompt
    print("[STEP 2] Building analysis prompt...")
    prompt = RESUME_ANALYSIS_PROMPT.format(resume_text=resume_text)

    # Step 3 — Call the LLM
    print("[STEP 3] Sending prompt to LLM (this may take a moment)...")
    raw_response = generate_text(prompt)
    print(f"[INFO] Received {len(raw_response)} characters from LLM.")

    # Step 4 — Parse the JSON response
    print("[STEP 4] Parsing LLM response as JSON...")
    analysis = _parse_json_response(raw_response)

    print("[DONE] Resume analysis complete.\n")
    return analysis


def _parse_json_response(raw: str) -> dict:
    """
    Attempts to extract valid JSON from the LLM response.
    Handles cases where the model wraps JSON in markdown code fences.
    """
    text = raw.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if text.startswith("```"):
        # Remove the opening fence (with optional language tag)
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        # Remove the closing fence
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
    print("[WARNING] Could not parse LLM response as JSON. Returning raw text.")
    return {"raw_response": raw}


# ──────────────────────────────────────────────
# 3. CLI Entry Point — Full CareerLens AI Pipeline
# ──────────────────────────────────────────────

if __name__ == "__main__":
    import pprint
    from agents.ats_agent import ats_agent
    from agents.interviewer_agent import interviewer_agent
    from agents.evaluator_agent import evaluator_agent
    from agents.feedback_agent import feedback_agent

    # Default to a sample resume; override via command-line arg
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "sample_resume.pdf"

    try:
        print("\n" + "=" * 60)
        print("        🚀 CareerLens AI — Full Pipeline")
        print("=" * 60)
        print("  Resume → ATS → Interview → Evaluation → Feedback\n")

        # ── Phase 1: Resume Analysis ─────────────────
        resume_result = analyze_resume(pdf_path)
        print("\n[PIPELINE] Phase 1 complete — Resume analyzed.")

        print("\n" + "=" * 60)
        print("           📄 RESUME ANALYSIS RESULT")
        print("=" * 60)
        pprint.pprint(resume_result, width=100)

        # ── Phase 2: ATS Optimization ────────────────
        print("\n[PIPELINE] Phase 2 — Sending data to ATS Optimizer...\n")
        ats_result = ats_agent(resume_result)
        print("\n[PIPELINE] Phase 2 complete — ATS optimization done.\n")

        print("=" * 60)
        print("           🎯 ATS OPTIMIZATION RESULT")
        print("=" * 60)
        pprint.pprint(ats_result, width=100)

        # ── Phase 3: Interview (optional) ────────────
        print("\n" + "=" * 60)
        choice = input("\n  Do you want to start an interview? (yes/no): ")

        if choice.strip().lower() == "yes":
            role = input("  Enter target role (e.g., Backend Developer): ")

            print(f"\n[PIPELINE] Phase 3 — Starting interview for role: {role}\n")
            interview_result = interviewer_agent(resume_result, role)

            print("\n" + "=" * 60)
            print("           🎤 INTERVIEW RESULT")
            print("=" * 60)
            pprint.pprint(interview_result, width=100)

            # ── Phase 4: Evaluation ──────────────────
            print("\n[PIPELINE] Phase 4 — Evaluating interview performance...\n")
            evaluation_result = evaluator_agent(interview_result)

            print("\n" + "=" * 60)
            print("           📊 EVALUATION RESULT")
            print("=" * 60)
            pprint.pprint(evaluation_result, width=100)

            # ── Phase 5: Final Feedback ──────────────
            print("\n[PIPELINE] Phase 5 — Generating final career feedback...\n")
            feedback_result = feedback_agent({
                "resume": resume_result,
                "ats": ats_result,
                "evaluation": evaluation_result
            })

            print("\n" + "=" * 60)
            print("           🏁 FINAL CAREER FEEDBACK")
            print("=" * 60)
            pprint.pprint(feedback_result, width=100)

        else:
            print("\n[PIPELINE] Interview skipped. Pipeline complete.\n")

        print("\n" + "=" * 60)
        print("  ✅ CareerLens AI Pipeline Finished Successfully!")
        print("=" * 60 + "\n")

    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
    except ValueError as e:
        print(f"[ERROR] {e}")
    except RuntimeError as e:
        print(f"[ERROR] {e}")
