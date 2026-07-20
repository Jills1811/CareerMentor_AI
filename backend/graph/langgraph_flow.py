import sys
import pprint
from pathlib import Path
from typing import TypedDict

# Allow imports from the backend root (parent of graph/)
sys.path.append(str(Path(__file__).resolve().parent.parent))

from langgraph.graph import StateGraph, END

from agents.resume_agent import analyze_resume
from agents.ats_agent import ats_agent
from agents.interviewer_agent import generate_questions, interviewer_agent
from agents.evaluator_agent import evaluator_agent
from agents.feedback_agent import feedback_agent


# ──────────────────────────────────────────────
# 1. Shared State Definition
# ──────────────────────────────────────────────

MAX_INTERVIEW_QUESTIONS = 7  # Stop condition: max questions per session


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
# 2. Node Functions
# ──────────────────────────────────────────────

def resume_node(state: GraphState) -> GraphState:
    """Node 1 — Extracts and analyzes resume from PDF."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 📄 Resume Node")
    print("─" * 60)
    try:
        state["resume"] = analyze_resume(state["pdf_path"])
    except Exception as e:
        print(f"  [GRAPH][ERROR] Resume Node failed: {e}")
        state["resume"] = {"error": str(e)}
    return state


def ats_node(state: GraphState) -> GraphState:
    """Node 2 — Optimizes resume for ATS systems."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 🎯 ATS Node")
    print("─" * 60)
    try:
        state["ats"] = ats_agent(state["resume"])
    except Exception as e:
        print(f"  [GRAPH][ERROR] ATS Node failed: {e}")
        state["ats"] = {"error": str(e)}
    return state


def decision_node(state: GraphState) -> GraphState:
    """Node 3 — Asks user whether to proceed with the interview."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 🔀 Decision Node")
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
    """
    Node 4 — Interactive Interview Loop.

    1. Generates questions via LLM (once)
    2. Loops through questions one by one
    3. Takes user answers with input validation
    4. Supports 'exit' to stop early
    5. Enforces MAX_INTERVIEW_QUESTIONS cap
    6. Stores structured Q&A pairs in state
    """
    print("\n" + "─" * 60)
    print(f"  [GRAPH] 🎤 Interview Node (role: {state['role']})")
    print("─" * 60)

    try:
        # Step 1: Generate questions from LLM
        questions = generate_questions(state["resume"], state["role"])

        if not questions:
            print("  [GRAPH][ERROR] No questions generated. Skipping interview.")
            state["interview"] = {"questions": [], "answers": [], "qa_pairs": []}
            return state

        # Cap to MAX_INTERVIEW_QUESTIONS
        questions = questions[:MAX_INTERVIEW_QUESTIONS]

        print(f"\n  📋 {len(questions)} questions ready. Type 'exit' anytime to stop.\n")

        # Step 2: Interactive Q&A loop
        answers = []
        qa_pairs = []

        for i, question in enumerate(questions):
            print("\n" + "=" * 50)
            print(f"  Question {i + 1}/{len(questions)}:")
            print(f"  {question}")
            print("=" * 50)

            # Step 3: Input validation — keep asking until non-empty
            while True:
                user_answer = input("\n  Your answer: ").strip()

                # Step 4a: Check for exit command
                if user_answer.lower() == "exit":
                    print("\n  🛑 Interview stopped by user.")
                    break

                # Step 4b: Reject empty answers
                if not user_answer:
                    print("  ⚠️  Answer cannot be empty. Please try again.")
                    continue

                # Valid answer — store it
                answers.append(user_answer)
                qa_pairs.append({
                    "question": question,
                    "answer": user_answer
                })
                print(f"  ✅ Answer recorded ({i + 1}/{len(questions)})")
                break
            else:
                # This else belongs to the while loop (runs if while didn't break)
                continue

            # If we broke out of while (exit command), break outer loop too
            if user_answer.lower() == "exit":
                break

        print(f"\n  [GRAPH] Interview completed: {len(answers)}/{len(questions)} questions answered.")

        # Step 5: Store in state
        state["interview"] = {
            "questions": questions,
            "answers": answers,
            "qa_pairs": qa_pairs
        }

    except Exception as e:
        print(f"  [GRAPH][ERROR] Interview Node failed: {e}")
        state["interview"] = {"error": str(e)}

    return state


def evaluator_node(state: GraphState) -> GraphState:
    """Node 5 — Evaluates interview answers and assigns scores."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 📊 Evaluator Node")
    print("─" * 60)
    try:
        interview_data = state.get("interview", {})
        qa_pairs = interview_data.get("qa_pairs", [])

        if not qa_pairs:
            print("  [GRAPH][WARNING] No Q&A pairs to evaluate. Skipping.")
            state["evaluation"] = {"error": "No interview data to evaluate"}
            return state

        # Pass the full interview dict (with qa_pairs) to the evaluator
        state["evaluation"] = evaluator_agent(interview_data)
    except Exception as e:
        print(f"  [GRAPH][ERROR] Evaluator Node failed: {e}")
        state["evaluation"] = {"error": str(e)}
    return state


def feedback_node(state: GraphState) -> GraphState:
    """Node 6 — Generates final career guidance from all outputs."""
    print("\n" + "─" * 60)
    print("  [GRAPH] 🏁 Feedback Node")
    print("─" * 60)
    try:
        state["feedback"] = feedback_agent({
            "resume": state["resume"],
            "ats": state["ats"],
            "evaluation": state.get("evaluation", {})
        })
    except Exception as e:
        print(f"  [GRAPH][ERROR] Feedback Node failed: {e}")
        state["feedback"] = {"error": str(e)}
    return state


# ──────────────────────────────────────────────
# 3. Conditional Router
# ──────────────────────────────────────────────

def route_decision(state: GraphState) -> str:
    """Routes to interview or directly to feedback based on user choice."""
    if state["start_interview"]:
        return "interview"
    return "feedback"


# ──────────────────────────────────────────────
# 4. Build the LangGraph
# ──────────────────────────────────────────────

# Create the graph with our state schema
graph = StateGraph(GraphState)

# Add nodes
graph.add_node("resume", resume_node)
graph.add_node("ats", ats_node)
graph.add_node("decision", decision_node)
graph.add_node("interview", interview_node)
graph.add_node("evaluator", evaluator_node)
graph.add_node("feedback", feedback_node)

# Set entry point
graph.set_entry_point("resume")

# Add sequential edges
graph.add_edge("resume", "ats")
graph.add_edge("ats", "decision")

# Add conditional branching after decision
graph.add_conditional_edges(
    "decision",
    route_decision,
    {
        "interview": "interview",
        "feedback": "feedback",
    }
)

# Add remaining sequential edges
graph.add_edge("interview", "evaluator")
graph.add_edge("evaluator", "feedback")
graph.add_edge("feedback", END)

# Compile the graph
app = graph.compile()


# ──────────────────────────────────────────────
# 5. Execution Function
# ──────────────────────────────────────────────

def run_langgraph(pdf_path: str) -> dict:
    """
    Executes the full CareerLens AI pipeline using LangGraph.

    Flow:
        Resume → ATS → Decision
                          ├─ yes → Interview → Evaluator ─┐
                          └─ no ──────────────────────────┤
                                                          ↓
                                                       Feedback → END
    """
    print("\n" + "=" * 60)
    print("     🚀 CareerLens AI — LangGraph Flow Engine")
    print("=" * 60)
    print("  Nodes: Resume → ATS → Decision → Interview")
    print("                → Evaluator → Feedback → END")
    print("=" * 60)

    initial_state: GraphState = {
        "pdf_path": pdf_path,
        "resume": {},
        "ats": {},
        "interview": {},
        "evaluation": {},
        "feedback": {},
        "role": "",
        "start_interview": False,
    }

    # Invoke the compiled graph
    result = app.invoke(initial_state)

    print("\n" + "=" * 60)
    print("  ✅ LangGraph Flow Execution Complete!")
    print("=" * 60 + "\n")

    return result


# ──────────────────────────────────────────────
# 6. CLI Entry Point
# ──────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python graph/langgraph_flow.py <resume.pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]

    final_state = run_langgraph(pdf_path)

    # Print each section of the final state
    sections = [
        ("📄 RESUME ANALYSIS",   "resume"),
        ("🎯 ATS OPTIMIZATION",  "ats"),
        ("🎤 INTERVIEW DATA",    "interview"),
        ("📊 EVALUATION RESULT", "evaluation"),
        ("🏁 CAREER FEEDBACK",   "feedback"),
    ]

    for title, key in sections:
        data = final_state.get(key, {})
        if data:
            print("\n" + "=" * 60)
            print(f"           {title}")
            print("=" * 60)
            pprint.pprint(data, width=100)

    print("\n" + "=" * 60)
    print("  🎉 CareerLens AI — All Done!")
    print("=" * 60 + "\n")
