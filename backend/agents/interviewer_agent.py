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
You are a professional technical interviewer.

Your task is to generate interview questions based on:

1. Candidate's resume data
2. Target role: {role}
3. Interview type: {interview_type}
4. Number of questions: {num_questions}

Resume Data:
\"\"\"
{data}
\"\"\"

Instructions:

- Generate easy to medium level questions line by line in increasing order.
- Questions must be industry-level.
- Focus on:
  - Technical skills
  - Projects
  - Real-world scenarios
  - Problem solving
- Include role-specific questions.
- Include resume-based questions.
- Match the interview type exactly:
  - all: balanced mix (technical + behavioral + project + HR)
  - technical: mostly core concepts, coding/problem-solving, system thinking
  - behavioral: communication, teamwork, conflict, leadership, ownership
  - project-based: deep dive into resume projects, architecture, trade-offs, impact
  - hr: motivation, fit, career goals, strengths/weaknesses

Return strictly JSON:

{{
  "questions": [
    "Question 1",
    "Question 2",
    ...
  ]
}}

Rules:
- Only JSON
- No explanation
- Return exactly {num_questions} questions
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
    print("[INTERVIEW][WARNING] Could not parse LLM response as JSON. Returning raw text.")
    return {"raw_response": response}


# ──────────────────────────────────────────────
# Question Generator (used by LangGraph nodes)
# ──────────────────────────────────────────────

def generate_questions(input_data, role, interview_type="all", num_questions=10) -> list:
    """
    Generates interview questions from resume data + role using the LLM.
    Returns a plain list of question strings (no interactive loop).
    """
    print("[INTERVIEW] Generating interview questions...")

    prompt = PROMPT_TEMPLATE.format(
        data=json.dumps(input_data, indent=2),
        role=role,
        interview_type=interview_type,
        num_questions=int(num_questions)
    )

    response = generate_text(prompt)

    print("[INTERVIEW] Parsing questions...")

    parsed = parse_json(response)
    questions = parsed.get("questions", [])

    # Ensure we always return a list of strings
    if not isinstance(questions, list):
        questions = []

    # Normalize output and enforce the requested count.
    questions = [str(q).strip() for q in questions if str(q).strip()]
    target_count = max(1, min(20, int(num_questions)))
    if len(questions) > target_count:
        questions = questions[:target_count]
    elif len(questions) < target_count:
        for i in range(len(questions) + 1, target_count + 1):
            questions.append(f"Question {i} for a {role} ({interview_type}) interview.")

    print(f"[INTERVIEW] {len(questions)} questions generated.")
    return questions


# ──────────────────────────────────────────────
# Interviewer Agent (standalone with built-in loop)
# ──────────────────────────────────────────────

def interviewer_agent(input_data, role, interview_type="all", num_questions=10) -> dict:
    """
    Generates interview questions based on resume data + target role,
    then conducts an interactive Q&A session with the user.

    Returns a dict with questions, answers, and qa_pairs.
    """
    questions = generate_questions(input_data, role, interview_type, num_questions)

    if not questions:
        print("[INTERVIEW][ERROR] No questions were generated. Aborting interview.")
        return {"questions": [], "answers": [], "qa_pairs": []}

    # Step 4: Interactive loop
    answers = []
    qa_pairs = []

    for i, question in enumerate(questions):
        print(f"\n{'─' * 50}")
        print(f"  Q{i + 1}/{len(questions)}: {question}")
        print(f"{'─' * 50}")

        answer = input("  Your Answer: ")
        answers.append(answer)

        qa_pairs.append({
            "question": question,
            "answer": answer
        })

        # Don't ask "continue?" on the last question
        if i < len(questions) - 1:
            cont = input("\n  Do you want to continue interview? (yes/no): ")
            if cont.strip().lower() != "yes":
                print("\n[INTERVIEW] Interview stopped early by user.")
                break

    print("\n[INTERVIEW] Interview completed.")
    print(f"[INTERVIEW] Total questions answered: {len(answers)}/{len(questions)}")

    return {
        "questions": questions,
        "answers": answers,
        "qa_pairs": qa_pairs
    }
