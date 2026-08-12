<p align="center">
  <h1 align="center">🔍 CareerMentor AI</h1>
  <p align="center">
    <strong>Multi-Agent Resume & Interview Intelligence System</strong>
  </p>
  <p align="center">
    A full-stack CareerMentor experience: a <strong>FastAPI</strong> multi-agent backend plus a <strong>React (Vite)</strong> web app for resumes, ATS insights, mock interviews (including voice), evaluation, and career feedback.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" alt="LangGraph"/>
  <img src="https://img.shields.io/badge/HuggingFace-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="HuggingFace"/>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the Server](#running-the-server)
- [Frontend Web App](#-frontend-web-app)
  - [Tech Stack](#frontend-tech-stack)
  - [Run the UI](#run-the-ui)
  - [Environment Variables](#frontend-environment-variables)
  - [App routes and features](#app-routes-and-features)
  - [Project Structure (`frontend/`)](#project-structure-frontend)
- [API Documentation](#-api-documentation)
  - [Upload Resume](#1-upload-resume)
  - [Start Interview](#2-start-interview)
  - [Answer Question](#3-answer-question)
  - [Get Feedback](#4-get-feedback)
  - [Session Status](#5-session-status)
- [Agent Details](#-agent-details)
  - [Resume Agent](#1-resume-agent-)
  - [ATS Agent](#2-ats-agent-)
  - [Interviewer Agent](#3-interviewer-agent-)
  - [Evaluator Agent](#4-evaluator-agent-)
  - [Feedback Agent](#5-feedback-agent-)
- [Graph Flow Engine](#-graph-flow-engine)
- [Configuration](#-configuration)

---

## 🌟 Overview

**CareerMentor AI** is a multi-agent system for end-to-end career intelligence. The **backend** takes a candidate's resume (PDF) and runs it through specialized AI agents. The **frontend** is a dashboard-style React app that calls the same FastAPI endpoints for upload, ATS, interviews, evaluation, and feedback.

```
Resume Upload → Resume Analysis → ATS Optimization → Mock Interview → Answer Evaluation → Career Feedback
```

The system exposes a **RESTful API** via FastAPI (used by the bundled React app) and also supports a **CLI-based pipeline** for direct execution. Agent orchestration can use **LangGraph** for stateful, graph-based execution with conditional branching.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📄 **Resume Parsing** | Extracts text from PDF resumes using PyPDF2 with page-level processing |
| 🤖 **AI-Powered Analysis** | Structured resume analysis via LLM — extracts skills, experience, projects, strengths, and weaknesses |
| 🎯 **ATS Optimization** | Identifies missing keywords, provides formatting feedback, and generates an ATS-friendly summary with a score |
| 🎤 **Mock Interview** | Generates role-specific questions based on resume data, selected interview type (`all/hr/behavioral/project-based/technical`), and selected question count (`10/15/20`) |
| 📊 **Answer Evaluation** | Evaluates interview answers with per-question scores, strengths, mistakes, and improvement suggestions |
| 🏁 **Career Guidance** | Delivers a final career roadmap with skill gap analysis, learning recommendations, and project suggestions |
| 🔀 **Graph Orchestration** | LangGraph-powered pipeline with conditional branching (interview is optional) |
| 🌐 **REST API** | Session-based FastAPI endpoints supporting the full pipeline workflow |
| 🖥 **Web dashboard** | React + Vite UI: resume upload, ATS views, mock interviews (voice + TTS), evaluation, feedback, light/dark theme |
| 💬 **Interactive CLI** | Command-line interface for running the complete pipeline with interactive Q&A |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CareerMentor AI                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐    ┌──────────┐    ┌────────────┐                │
│   │  Resume  │──▶│   ATS    │───▶│  Decision  │                │
│   │  Agent   │    │  Agent   │    │   Node     │                │
│   └──────────┘    └──────────┘    └─────┬──────┘                │
│                                         │                       │
│                              ┌──────────┴──────────┐            │
│                              │                     │            │
│                          YES ▼                 NO  ▼            │
│                    ┌──────────────┐                │            │
│                    │ Interviewer  │                │            │
│                    │    Agent     │                │            │
│                    └──────┬───────┘                │            │
│                           ▼                        │            │
│                    ┌──────────────┐                │            │
│                    │  Evaluator   │                │            │
│                    │    Agent     │                │            │
│                    └──────┬───────┘                │            │
│                           │                        │            │
│                           └────────────┬───────────┘            │
│                                        ▼                        │
│                                 ┌──────────────┐                │
│                                 │   Feedback   │                │
│                                 │    Agent     │                │
│                                 └──────────────┘                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│          HuggingFace Inference API (LLM Backend)                │
└─────────────────────────────────────────────────────────────────┘
```

**Pipeline Flow:**

1. **Resume Agent** — Extracts text from PDF and produces a structured analysis
2. **ATS Agent** — Optimizes the resume data for Applicant Tracking Systems
3. **Decision Node** — User chooses whether to proceed with a mock interview
4. **Interviewer Agent** — Generates role-specific questions from resume + target role + interview type + selected question count
5. **Evaluator Agent** — Scores and evaluates each interview answer
6. **Feedback Agent** — Synthesizes all data into a final career guidance report

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| **Python 3.10+** | Core programming language |
| **FastAPI** | REST API framework with automatic OpenAPI docs |
| **LangGraph** | Multi-agent graph orchestration with stateful execution |
| **LangChain** | LLM integration and agent framework |
| **HuggingFace Inference API** | LLM backend (OpenAI-compatible chat completions) |
| **PyPDF2** | PDF text extraction |
| **Pydantic** | Request/response data validation |
| **Uvicorn** | ASGI server for FastAPI |
| **python-dotenv** | Environment variable management |

### Frontend (dashboard)

| Technology | Purpose |
|---|---|
| **React 19** | UI library |
| **Vite** | Dev server & production build |
| **React Router** | Client-side routing (public + protected dashboard) |
| **Tailwind CSS v4** | Styling & design tokens (`frontend/src/index.css`) |
| **axios** | HTTP client (auth helpers in `frontend/src/services/api.js`) |
| **Web Speech API** | Text-to-speech for questions; speech-to-text for answers (`frontend/src/utils/speech.js`) |

---

## 📂 Project Structure

```
CareerMentor_AI/
├── .env                          # Environment variables (API tokens)
├── .gitignore                    # Git ignore rules
├── README.md                     # This file
├── frontend/                     # React + Vite dashboard
│   ├── package.json
│   ├── vite.config.*
│   ├── index.html
│   ├── public/                   # Static assets (favicon, icons)
│   └── src/
│       ├── App.jsx               # Routes (landing, auth, dashboard shell)
│       ├── index.css             # Global styles + Tailwind theme
│       ├── layouts/              # MainLayout, DashboardLayout
│       ├── components/           # ProtectedRoute, etc.
│       ├── pages/                # Landing, Login, Signup, Dashboard, Resumes, Interviews, …
│       ├── services/api.js       # Auth API helpers + token storage
│       └── utils/speech.js       # speakText / cancelSpeech (TTS)
│
├── backend/
│   ├── main.py                   # CLI entry point (basic LLM test)
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Backend-level env config
│   │
│   ├── agents/                   # AI Agent modules
│   │   ├── resume_agent.py       # PDF parsing + resume analysis
│   │   ├── ats_agent.py          # ATS optimization engine
│   │   ├── interviewer_agent.py  # Question generation + interactive interview
│   │   ├── evaluator_agent.py    # Answer scoring + evaluation
│   │   └── feedback_agent.py     # Career guidance + roadmap generation
│   │
│   ├── api/                      # FastAPI REST API layer
│   │   ├── __init__.py
│   │   └── main.py               # API routes & session management
│   │
│   ├── graph/                    # Pipeline orchestration
│   │   ├── flow.py               # Manual graph flow (no LangGraph dependency)
│   │   └── langgraph_flow.py     # LangGraph-based flow with StateGraph
│   │
│   ├── models/                   # LLM configuration
│   │   └── llm.py                # HuggingFace API wrapper
│   │
│   └── temp/                     # Temporary uploaded resume storage
│
├── server/                       # Node.js + Express API (legacy/alternate backend)
│   ├── package.json              # Server dependencies and scripts
│   ├── src/
│   │   ├── index.js              # Express app entry point
│   │   ├── config/               # DB and app configuration
│   │   ├── middleware/           # Auth/error middleware
│   │   ├── models/               # Mongoose schemas
│   │   └── routes/               # API route definitions
│   └── .env                      # Server environment variables
│
└── venv/                         # Python virtual environment
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** installed on your system
- **HuggingFace account** with an API token ([Get one here](https://huggingface.co/settings/tokens))
- **pip** package manager

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Jills1811/CareerMentor_AI.git
   cd CareerMentor_AI
   ```

2. **Create a virtual environment:**

   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**

   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **Linux/macOS:**
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies:**

   ```bash
   pip install -r backend/requirements.txt
   ```

### Environment Variables

Create a `.env` file in the project root with your HuggingFace API token:

```env
HUGGINGFACEHUB_API_TOKEN=hf_your_api_token_here
```

> ⚠️ **Important:** Never commit your API tokens to version control. Add `.env` to your `.gitignore` file.

### Running the Server

**Start the FastAPI server:**

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **Base URL:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

**Run the CLI pipeline (alternative):**

```bash
python backend/graph/langgraph_flow.py path/to/resume.pdf
```

Or use the simpler flow without LangGraph:

```bash
python backend/graph/flow.py path/to/resume.pdf
```

---

## 🖥 Frontend Web App

The `frontend/` directory is a **Vite + React** single-page application. It expects the FastAPI backend to be reachable (default `http://localhost:8000` unless overridden).

### Frontend tech stack

See the **Frontend (dashboard)** table under [Tech Stack](#-tech-stack).

### Run the UI

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

- Dev server: **Vite** prints a local URL (typically `http://localhost:5173`).
- Production build: `npm run build` → static assets in `frontend/dist/`.
- Lint: `npm run lint`.

Run the **backend** in a separate terminal (see [Running the Server](#running-the-server)) so uploads, interviews, and feedback work end-to-end.

### Frontend environment variables

Optional file: `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL for the FastAPI server (e.g. `http://localhost:8000`). Used by `frontend/src/services/api.js`. Fetch calls in some pages may still use `http://localhost:8000` directly; set the server URL consistently for your environment. |

### App routes and features

**Public**

- `/` — Landing
- `/login`, `/signup` — Authentication

**Protected (dashboard layout)**

- `/dashboard` — Summary / quick actions
- `/resumes` — **Uploaded Resumes**: PDF upload, list, ATS details per resume, shortcut to start interview
- `/ats-analysis` — Dedicated ATS report view
- `/interviews` — Interview history; **mock interview** flow with **TTS** (read questions) and **speech-to-text** (voice answers); submit / skip / **previous question**
- `/evaluation` — Question-wise evaluation across past interviews
- `/feedback` — Aggregated resume / ATS feedback patterns
- `/settings` — Profile, security (password UI), appearance (light/dark), FAQs; `/profile` redirects here

**UX notes**

- **Theme:** Light/dark uses `data-theme` on `<html>` and `localStorage` key `CareerMentor_theme`. A **sidebar toggle** mirrors the Settings appearance control.
- **Voice:** Uses browser **Speech Synthesis** and **Speech Recognition** (Chrome/Edge generally best). Microphone permission may be required.

### Project structure (`frontend/`)

High-level layout (see tree under [Project Structure](#-project-structure) above). Page-specific styles live beside components (e.g. `InterviewsPage.css`).

---

## 📡 API Documentation

The API uses a **session-based workflow**. Each resume upload creates a unique session that tracks the entire pipeline state.

### Workflow Overview

```
POST /upload-resume  →  POST /start-interview  →  POST /answer-question (×N)  →  GET /get-feedback
```

---

### 1. Upload Resume

**`POST /upload-resume`**

Uploads a PDF resume, runs the **Resume Analyzer** and **ATS Optimizer**, and returns results with a session ID.

**Request:**
```bash
curl -X POST http://localhost:8000/upload-resume \
  -F "file=@resume.pdf"
```

**Response:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "resume": {
    "name": "John Doe",
    "email": "john@example.com",
    "skills": ["Python", "FastAPI", "Machine Learning"],
    "education": ["B.Tech in Computer Science"],
    "experience": ["Software Engineer at XYZ (2 years)"],
    "projects": ["AI Chatbot", "E-commerce Platform"],
    "strengths": ["Strong technical skills"],
    "weaknesses": ["Limited leadership experience"],
    "suggestions": ["Add certifications", "Quantify achievements"]
  },
  "ats": {
    "missing_keywords": ["CI/CD", "Docker", "Agile"],
    "improvements": ["Add technical summary section"],
    "optimized_summary": "Results-driven software engineer...",
    "ats_score": "72",
    "keyword_density_feedback": "Good keyword usage in skills...",
    "formatting_feedback": "Use standard section headers..."
  }
}
```

---

### 2. Start Interview

**`POST /start-interview`**

Generates interview questions based on the resume, target role, interview type, and question count. Returns the first question.

**Request:**
```json
{
  "user_id": "demo_user_123",
  "resume_id": "67f3c72f4a2d1ebf4b8a1234",
  "role": "Backend Developer",
  "interview_type": "technical",
  "num_questions": 15
}
```

Allowed values:
- `interview_type`: `all` (default), `hr`, `behavioral`, `project-based`, `technical`
- `num_questions`: `10` (default), `15`, `20`

**Response:**
```json
{
  "message": "Interview started",
  "interview_type": "technical",
  "total_questions": 10,
  "question_number": 1,
  "question": "Explain the difference between REST and GraphQL APIs."
}
```

---

### 3. Answer Question

**`POST /answer-question`**

Submits an answer for the current question and receives the next one.

**Request:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "answer": "REST uses resource-based URLs with HTTP methods, while GraphQL uses a single endpoint with flexible queries..."
}
```

**Response (next question):**
```json
{
  "message": "Answer recorded",
  "question_number": 2,
  "total_questions": 10,
  "question": "How would you design a rate limiter for an API?"
}
```

**Response (interview complete):**
```json
{
  "message": "Interview completed",
  "total_questions": 10,
  "answers_recorded": 10
}
```

---

### 4. Get Feedback

**`GET /get-feedback?session_id=<session_id>`**

Runs the **Evaluator Agent** and **Feedback Agent** on completed interview data.

**Response:**
```json
{
  "evaluation": {
    "overall_score": 7.5,
    "question_wise_feedback": [
      {
        "question": "Explain REST vs GraphQL...",
        "score": 8,
        "strengths": ["Clear comparison", "Good examples"],
        "mistakes": ["Missed subscription feature of GraphQL"],
        "improvements": ["Mention real-time use cases"]
      }
    ],
    "overall_strengths": ["Strong conceptual understanding"],
    "overall_weaknesses": ["Lacks depth in system design"],
    "final_suggestions": ["Practice system design questions"]
  },
  "feedback": {
    "final_assessment": "Intermediate-level backend developer",
    "skill_gaps": ["System Design", "DevOps"],
    "strengths": ["API Development", "Python"],
    "weak_areas": ["Cloud services", "Containerization"],
    "learning_recommendations": ["Study system design patterns", "Learn Docker & Kubernetes"],
    "project_suggestions": ["Build a microservices architecture", "Deploy on AWS"],
    "career_roadmap": ["Master DSA", "Learn system design", "Build portfolio projects"],
    "confidence_level": "Intermediate"
  }
}
```

---

### 5. Session Status

**`GET /session-status?session_id=<session_id>`**

Returns the current state of a session for debugging or frontend sync.

**Response:**
```json
{
  "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "role": "Backend Developer",
  "total_questions": 10,
  "answers_recorded": 5,
  "current_question_index": 5,
  "has_evaluation": false,
  "has_feedback": false,
  "created_at": "2026-03-31T10:30:00"
}
```

---

## 🤖 Agent Details

### 1. Resume Agent 📄

**File:** `backend/agents/resume_agent.py`

| Aspect | Detail |
|---|---|
| **Input** | PDF file path |
| **Process** | Extracts text via PyPDF2 → Sends structured prompt to LLM → Parses JSON response |
| **Output** | `{ name, email, skills, education, experience, projects, strengths, weaknesses, suggestions }` |

**Key capabilities:**
- Multi-page PDF text extraction with page-level warnings
- Handles image-based/scanned PDFs with meaningful error messages
- Robust JSON parsing with markdown fence stripping and fallback extraction

---

### 2. ATS Agent 🎯

**File:** `backend/agents/ats_agent.py`

| Aspect | Detail |
|---|---|
| **Input** | Structured resume dict (from Resume Agent) |
| **Process** | Analyzes resume data for ATS compatibility → Generates optimization suggestions |
| **Output** | `{ missing_keywords, improvements, optimized_summary, ats_score, keyword_density_feedback, formatting_feedback }` |

**Key capabilities:**
- Identifies missing industry-relevant keywords
- Provides an ATS compatibility score (out of 100)
- Generates an optimized professional summary
- Analyzes keyword density and formatting issues

---

### 3. Interviewer Agent 🎤

**File:** `backend/agents/interviewer_agent.py`

| Aspect | Detail |
|---|---|
| **Input** | Resume data + target role + interview type + requested question count |
| **Process** | Generates interview-type-aware questions via LLM |
| **Output** | `{ questions[], answers[], qa_pairs[] }` |

**Key capabilities:**
- Supports interview types: `all`, `hr`, `behavioral`, `project-based`, `technical`
- Supports question count selection: `10`, `15`, or `20` (default `10`)
- Questions progress from easy to medium difficulty
- Covers technical skills, projects, scenarios, and problem-solving
- Supports both API-driven (stateless) and CLI (interactive) modes

---

### 4. Evaluator Agent 📊

**File:** `backend/agents/evaluator_agent.py`

| Aspect | Detail |
|---|---|
| **Input** | Interview Q&A pairs |
| **Process** | Evaluates each answer → Assigns scores → Identifies strengths & mistakes |
| **Output** | `{ overall_score, question_wise_feedback[], overall_strengths, overall_weaknesses, final_suggestions }` |

**Key capabilities:**
- Per-question scoring (out of 10)
- Identifies strengths, mistakes, and improvements for each answer
- Calculates an aggregate overall score
- Provides constructive, industry-standard feedback

---

### 5. Feedback Agent 🏁

**File:** `backend/agents/feedback_agent.py`

| Aspect | Detail |
|---|---|
| **Input** | Combined data from Resume, ATS, and Evaluator agents |
| **Process** | Synthesizes all analysis into a career guidance report |
| **Output** | `{ final_assessment, skill_gaps, strengths, weak_areas, learning_recommendations, project_suggestions, career_roadmap, confidence_level }` |

**Key capabilities:**
- Holistic candidate assessment combining all pipeline outputs
- Skill gap analysis and learning resource recommendations
- Portfolio project suggestions for profile improvement
- Step-by-step career roadmap
- Confidence level estimation (Beginner / Intermediate / Advanced)

---

## 🔀 Graph Flow Engine

CareerMentor AI offers **two graph execution modes**:

### 1. Manual Flow (`graph/flow.py`)

A lightweight, dependency-free execution engine that manually chains agent calls with conditional branching. No external orchestration library required.

```bash
python backend/graph/flow.py resume.pdf
```

### 2. LangGraph Flow (`graph/langgraph_flow.py`)

A production-grade flow built on **LangGraph's StateGraph** with:

- **Typed state management** via `TypedDict`
- **Conditional edges** for interview branching
- **Error handling** at every node
- **Max question cap** (configurable, default: 7)
- **Input validation** with exit command support

```bash
python backend/graph/langgraph_flow.py resume.pdf
```

**Graph Visualization:**

```
[Resume] ──▶ [ATS] ──▶ [Decision]
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              [Interview]     [Feedback] ──▶ END
                    │
                    ▼
              [Evaluator]
                    │
                    ▼
              [Feedback] ──▶ END
```

---

## ⚙️ Configuration

### LLM Model

The default LLM model is configured in `backend/models/llm.py`:

```python
model = "openai/gpt-oss-120b"  # via HuggingFace router
```

To switch models, update the `model` variable. Supported models include any model available on the [HuggingFace Inference API](https://huggingface.co/models) with chat completion support.

---

<p align="center">
  Built with ❤️ using Python, FastAPI, LangGraph & HuggingFace by <i>Ambaliya Jills</i>
</p>
