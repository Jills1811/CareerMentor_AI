import sys
import pprint
from pathlib import Path
from typing import TypedDict

# Allow imports from the backend root (parent of graph/)
sys.path.append(str(Path(__file__).resolve().parent.parent))

from agents.resume_agent import analyze_resume
from agents.ats_agent import ats_agent
from agents.interviewer_agent import interviewer_agent
from agents.evaluator_agent import evaluator_agent
from agents.feedback_agent import feedback_agent


# ──────────────────────────────────────────────
# 1. Shared State Definition
# ──────────────────────────────────────────────

class GraphState(TypedDict):
    pdf_path: str
    resume: dict
    ats: dict
    interview: dict
    evaluation: dict
    feedback: dict
    role: str
    start_interview: bool


# ──────────────────────────────────────────────
# 2. Node Definitions
# ──────────────────────────────────────────────

def resume_node(state: GraphState) -> GraphState:
    """Node 1 — Extracts and analyzes resume from PDF."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 📄 Running Resume Node...")
    print("─" * 60)
    try:
        result = analyze_resume(state["pdf_path"])
        state["resume"] = result
    except Exception as e:
        print(f"  [GRAPH][ERROR] Resume Node failed: {e}")
        state["resume"] = {"error": str(e)}
    return state


def ats_node(state: GraphState) -> GraphState:
    """Node 2 — Optimizes resume for ATS systems."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 🎯 Running ATS Node...")
    print("─" * 60)
    try:
        result = ats_agent(state["resume"])
        state["ats"] = result
    except Exception as e:
        print(f"  [GRAPH][ERROR] ATS Node failed: {e}")
        state["ats"] = {"error": str(e)}
    return state


def decision_node(state: GraphState) -> GraphState:
    """Node 3 — Asks user whether to proceed with the interview."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 🔀 Decision Node — Interview?")
    print("─" * 60)

    choice = input("\n  Do you want to start an interview? (yes/no): ")
    state["start_interview"] = choice.strip().lower() == "yes"

    if state["start_interview"]:
        role = input("  Enter target role (e.g., Backend Developer): ")
        state["role"] = role
    else:
        print("  [GRAPH] Interview skipped by user.")

    return state


def interview_node(state: GraphState) -> GraphState:
    """Node 4 — Generates questions and conducts interactive interview."""
    print("\n" + "─" * 60)
    print(f"  [GRAPH] 🎤 Running Interview Node (role: {state['role']})...")
    print("─" * 60)
    try:
        result = interviewer_agent(state["resume"], state["role"])
        state["interview"] = result
    except Exception as e:
        print(f"  [GRAPH][ERROR] Interview Node failed: {e}")
        state["interview"] = {"error": str(e)}
    return state


def evaluator_node(state: GraphState) -> GraphState:
    """Node 5 — Evaluates interview answers and assigns scores."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 📊 Running Evaluator Node...")
    print("─" * 60)
    try:
        result = evaluator_agent(state["interview"])
        state["evaluation"] = result
    except Exception as e:
        print(f"  [GRAPH][ERROR] Evaluator Node failed: {e}")
        state["evaluation"] = {"error": str(e)}
    return state


def feedback_node(state: GraphState) -> GraphState:
    """Node 6 — Generates final career guidance from all agent outputs."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 🏁 Running Feedback Node...")
    print("─" * 60)
    try:
        result = feedback_agent({
            "resume": state["resume"],
            "ats": state["ats"],
            "evaluation": state.get("evaluation", {})
        })
        state["feedback"] = result
    except Exception as e:
        print(f"  [GRAPH][ERROR] Feedback Node failed: {e}")
        state["feedback"] = {"error": str(e)}
    return state


# ──────────────────────────────────────────────
# 3. Graph Execution Engine
# ──────────────────────────────────────────────

def run_graph(pdf_path: str) -> GraphState:
    """
    Executes the full CareerLens AI pipeline as a graph flow.

    Flow:
        Resume → ATS → Decision
                          ├─ yes → Interview → Evaluator ─┐
                          └─ no ──────────────────────────┤
                                                          ↓
                                                       Feedback
    """
    print("\n" + "=" * 60)
    print("     🚀 CareerLens AI — Graph Flow Engine")
    print("=" * 60)
    print("  Nodes: Resume → ATS → Decision → Interview")
    print("                → Evaluator → Feedback")
    print("=" * 60)

    # Initialize shared state
    state: GraphState = {
        "pdf_path": pdf_path,
        "resume": {},
        "ats": {},
        "interview": {},
        "evaluation": {},
        "feedback": {},
        "role": "",
        "start_interview": False,
    }

    # Step 1: Resume Analysis
    state = resume_node(state)

    # Step 2: ATS Optimization
    state = ats_node(state)

    # Step 3: Decision — Start interview?
    state = decision_node(state)

    # Step 4: Conditional Branch
    if state["start_interview"]:
        state = interview_node(state)
        state = evaluator_node(state)

    # Step 5: Final Feedback (always runs)
    state = feedback_node(state)

    print("\n" + "=" * 60)
    print("  ✅ Graph Flow Execution Complete!")
    print("=" * 60 + "\n")

    return state


# ──────────────────────────────────────────────
# 4. CLI Entry Point
# ──────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python graph/flow.py <resume.pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    final_state = run_graph(pdf_path)

    # ── Print each section of the final state ────
    sections = [
        ("📄 RESUME ANALYSIS",   "resume"),
        ("🎯 ATS OPTIMIZATION",  "ats"),
        ("🎤 INTERVIEW DATA",    "interview"),
        ("📊 EVALUATION RESULT", "evaluation"),
        ("🏁 CAREER FEEDBACK",   "feedback"),
    ]

    for title, key in sections:
        data = final_state.get(key, {})
        if data:  # Only print non-empty sections
            print("\n" + "=" * 60)
            print(f"           {title}")
            print("=" * 60)
            pprint.pprint(data, width=100)

    print("\n" + "=" * 60)
    print("  🎉 CareerLens AI — All Done!")
    print("=" * 60 + "\n")
