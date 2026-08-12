import sys
import os
import uuid
import shutil
import logging
from pathlib import Path
from datetime import datetime

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent

# Allow imports from the backend package (agents/, models/, etc.)
sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson.objectid import ObjectId
import json
import hashlib
import bcrypt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

from agents.resume_agent import analyze_resume_with_text
from agents.ats_agent import ats_agent
from agents.interviewer_agent import generate_questions
from agents.evaluator_agent import evaluator_agent
from agents.feedback_agent import feedback_agent

# Load envs in priority order so existing server/.env values can be reused.
for env_path in [ROOT_DIR / ".env", BACKEND_DIR / ".env", ROOT_DIR / "server" / ".env"]:
    if env_path.exists():
        load_dotenv(env_path, override=False)

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("CareerLensAPI")


# ──────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────

app = FastAPI(
    title="CareerLens AI",
    description="Multi-Agent Resume & Interview Intelligence System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# In-Memory Session Storage
# ──────────────────────────────────────────────

sessions: dict = {}

TEMP_DIR = BACKEND_DIR / "temp"
TEMP_DIR.mkdir(exist_ok=True)


def _get_mongo_uri() -> str:
    uri = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI")
    if uri and uri.strip():
        return uri.strip()
    return "mongodb://localhost:27017/"


def _connect_mongodb():
    mongo_uri = _get_mongo_uri()
    db_name = os.getenv("MONGO_DB_NAME", "careermentor_ai")
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)
        client.admin.command("ping")
        logger.info(f"MongoDB connected (database: {db_name})")
        return client, client[db_name]
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        return None, None


mongo_client, db = _connect_mongodb()


def _delete_temp_pdf(file_path: Path) -> None:
    """Remove a temporary uploaded PDF after its content has been processed."""
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted temporary PDF: {file_path.name}")
    except OSError as e:
        logger.warning(f"Failed to delete temporary PDF {file_path}: {e}")


def _get_session(session_id: str) -> dict:
    """Retrieve a session or raise 404."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return sessions[session_id]


def _to_number(value, default=0.0):
    try:
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            cleaned = value.replace("/10", "").replace("/100", "").strip()
            return float(cleaned)
    except Exception:
        pass
    return float(default)


def _normalize_evaluation_result(evaluation_result: dict, attempted_pairs: list[dict]) -> dict:
    """
    Normalize evaluator output so the frontend always gets usable score + question-wise data.
    """
    normalized = evaluation_result if isinstance(evaluation_result, dict) else {}
    qwf = normalized.get("question_wise_feedback")
    qwf = qwf if isinstance(qwf, list) else []

    normalized_qwf = []
    for idx, pair in enumerate(attempted_pairs):
        incoming = qwf[idx] if idx < len(qwf) and isinstance(qwf[idx], dict) else {}
        answer_text = str(pair.get("answer", "")).strip()
        length_score = min(10, max(1, len(answer_text.split()) // 8 + 2))
        score = _to_number(incoming.get("score", length_score), default=length_score)
        score = max(0, min(10, score))

        strengths = incoming.get("strengths")
        strengths = strengths if isinstance(strengths, list) else []
        mistakes = incoming.get("mistakes")
        mistakes = mistakes if isinstance(mistakes, list) else []
        improvements = incoming.get("improvements")
        improvements = improvements if isinstance(improvements, list) else []

        if not improvements:
            improvements = ["Add a clearer structure: concept, approach, and one practical example."]
        if not mistakes:
            mistakes = ["Could be more specific and technically detailed."]

        normalized_qwf.append({
            "question": incoming.get("question") or pair.get("question", ""),
            "score": round(score, 1),
            "strengths": strengths,
            "mistakes": mistakes,
            "improvements": improvements,
            "expected_answer": incoming.get("expected_answer", ""),
        })

    if normalized_qwf:
        avg_10 = sum(item["score"] for item in normalized_qwf) / len(normalized_qwf)
        overall_100 = round(avg_10 * 10, 1)
    else:
        overall_100 = 0

    normalized["question_wise_feedback"] = normalized_qwf
    normalized["overall_score"] = round(_to_number(normalized.get("overall_score", overall_100), default=overall_100), 1)
    if normalized["overall_score"] <= 10:
        normalized["overall_score"] = round(normalized["overall_score"] * 10, 1)
    normalized["overall_score"] = max(0, min(100, normalized["overall_score"]))
    normalized["overall_strengths"] = normalized.get("overall_strengths") if isinstance(normalized.get("overall_strengths"), list) else []
    normalized["overall_weaknesses"] = normalized.get("overall_weaknesses") if isinstance(normalized.get("overall_weaknesses"), list) else []
    normalized["final_suggestions"] = normalized.get("final_suggestions") if isinstance(normalized.get("final_suggestions"), list) else []

    return normalized


# ──────────────────────────────────────────────
# Request / Response Models
# ──────────────────────────────────────────────

class StartInterviewRequest(BaseModel):
    user_id: str
    resume_id: str
    role: str
    interview_type: str = "all"
    num_questions: int = 10


class AnswerRequest(BaseModel):
    session_id: str
    answer: str


class PreviousQuestionRequest(BaseModel):
    session_id: str


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    confirmPassword: str

class UpdateProfileRequest(BaseModel):
    user_id: str
    name: str = None
    old_password: str = None
    new_password: str = None


# ──────────────────────────────────────────────
# Helper: hash password
# ──────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Check if it's a bcrypt hash (starts with $2a$, $2b$, etc.)
        if hashed_password.startswith("$2"):
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        else:
            # Fallback to simple sha256
            return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def send_welcome_email(to_email: str, user_name: str) -> tuple[bool, str]:
    """
    Sends a welcome email to newly registered users.
    Returns (success, message). This is best-effort and must not block signup.
    """
    # If host/port are not set but EMAIL_USER/PASS exist, default to Gmail SMTP.
    email_host = os.getenv("EMAIL_HOST") or "smtp.gmail.com"
    email_port = int(os.getenv("EMAIL_PORT", "587"))
    email_user = os.getenv("EMAIL_USER")
    email_pass = os.getenv("EMAIL_PASS")
    email_from = os.getenv("EMAIL_FROM", email_user or "noreply@careerlensai.com")

    if not all([email_host, email_user, email_pass]):
        return False, "Email not configured"

    subject = "Welcome to CareerLens AI! 🚀"
    app_url = os.getenv("FRONTEND_URL")
    safe_name = user_name.replace("<", "").replace(">", "").strip() or "there"
    html_body = f"""
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to CareerLens AI</title>
      </head>
      <body style="margin:0;padding:0;background:#0a0b17;font-family:Inter,Arial,sans-serif;color:#eaeaf4;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0b17;padding:24px 8px;">
          <tr>
            <td align="center">
              <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:560px;max-width:100%;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);background:#0f1124;">
                <tr>
                  <td style="padding:28px 26px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);text-align:center;">
                    <div style="font-size:36px;line-height:1;margin-bottom:10px;">🔎</div>
                    <div style="font-size:40px;font-weight:900;letter-spacing:-0.03em;color:#ffffff;">
                      CareerLens <span style="color:#d8d5ff;">AI</span>
                    </div>
                    <div style="margin-top:8px;font-size:20px;color:#ebe8ff;font-weight:500;">
                      AI-Powered Career Intelligence Platform
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px 28px;">
                    <h1 style="margin:0 0 18px 0;font-size:38px;line-height:1.15;color:#ffffff;font-weight:900;letter-spacing:-0.02em;">
                      Welcome aboard, {safe_name}! 🚀
                    </h1>
                    <p style="margin:0 0 24px 0;font-size:24px;line-height:1.55;color:#bfc2dc;">
                      Welcome to <span style="color:#ffffff;font-weight:700;">CareerLens AI</span>! We are excited to help you grow your career.
                      Our AI-powered platform gives you everything you need to prepare smarter and faster.
                    </p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:2px 0 28px 0;">
                      <tr>
                        <td style="padding:8px 0;">
                          <div style="display:flex;align-items:flex-start;">
                            <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background:rgba(102,126,234,0.22);color:#d5c9ff;font-size:18px;margin-right:12px;">📄</span>
                            <div>
                              <div style="font-size:21px;font-weight:800;color:#ffffff;">Resume Analysis</div>
                              <div style="font-size:18px;color:#aeb2cf;margin-top:2px;">AI-powered resume parsing and insights</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <div style="display:flex;align-items:flex-start;">
                            <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background:rgba(244,114,182,0.20);color:#ffd1e6;font-size:18px;margin-right:12px;">🎯</span>
                            <div>
                              <div style="font-size:21px;font-weight:800;color:#ffffff;">ATS Optimization</div>
                              <div style="font-size:18px;color:#aeb2cf;margin-top:2px;">Beat applicant tracking systems</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <div style="display:flex;align-items:flex-start;">
                            <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background:rgba(79,172,254,0.20);color:#cde9ff;font-size:18px;margin-right:12px;">🎙️</span>
                            <div>
                              <div style="font-size:21px;font-weight:800;color:#ffffff;">AI Mock Interviews</div>
                              <div style="font-size:18px;color:#aeb2cf;margin-top:2px;">Practice with an intelligent AI interviewer</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <div style="display:flex;align-items:flex-start;">
                            <span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background:rgba(67,233,123,0.20);color:#cbffe4;font-size:18px;margin-right:12px;">📊</span>
                            <div>
                              <div style="font-size:21px;font-weight:800;color:#ffffff;">Career Feedback</div>
                              <div style="font-size:18px;color:#aeb2cf;margin-top:2px;">Personalized roadmap based on your performance</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div style="text-align:center;margin:8px 0 6px 0;">
                      <a href="{app_url}" style="display:inline-block;padding:16px 34px;border-radius:14px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;font-weight:800;font-size:20px;text-decoration:none;box-shadow:0 8px 24px rgba(102,126,234,0.35);">
                        Get Started →
                      </a>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;background:#0d1020;">
                    <div style="font-size:15px;color:#8d93b6;">
                      © 2026 CareerLens AI. Built with ❤️ for your career growth.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = email_from
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(email_host, email_port, timeout=20) as server:
            server.starttls()
            server.login(email_user, email_pass)
            server.sendmail(email_from, [to_email], msg.as_string())

        return True, "Welcome email sent"
    except Exception as e:
        logger.error(f"Welcome email failed for {to_email}: {e}")
        return False, f"Email send failed: {e}"


# ──────────────────────────────────────────────
# ENDPOINT 1: User Login
# ──────────────────────────────────────────────

@app.post("/auth/login")
async def login(req: LoginRequest):
    """
    Authenticate user against MongoDB users collection.
    """
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    
    # Find user by email
    user = db.users.find_one({"email": req.email.strip().lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(req.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_id = str(user["_id"])
    user_data = {
        "id": user_id,
        "name": user.get("name", "User"),
        "email": user.get("email")
    }
    
    token = f"token_{user_id}"
    
    return {
        "success": True,
        "data": {
            "user": user_data,
            "token": token
        },
        "message": "Login successful"
    }


# ──────────────────────────────────────────────
# ENDPOINT 2: User Signup
# ──────────────────────────────────────────────

@app.post("/auth/signup")
async def signup(req: SignupRequest):
    """
    Create a new user in MongoDB users collection.
    """
    if not req.email or not req.name or not req.password:
        raise HTTPException(status_code=400, detail="All fields are required")
    
    if req.password != req.confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    
    # Check for duplicate email
    existing = db.users.find_one({"email": req.email.strip().lower()})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    
    # Insert new user
    hashed = hash_password(req.password)
    result = db.users.insert_one({
        "name": req.name.strip(),
        "email": req.email.strip().lower(),
        "password": hashed,
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    })
    
    user_id = str(result.inserted_id)
    user_data = {
        "id": user_id,
        "name": req.name.strip(),
        "email": req.email.strip().lower()
    }
    
    email_sent, email_status = send_welcome_email(
        to_email=req.email.strip().lower(),
        user_name=req.name.strip(),
    )

    token = f"token_{user_id}"
    
    return {
        "success": True,
        "data": {
            "user": user_data,
            "token": token,
            "welcomeEmailSent": email_sent,
        },
        "message": "Signup successful" if email_sent else f"Signup successful (email status: {email_status})"
    }


# ──────────────────────────────────────────────
# ENDPOINT: Update Profile
# ──────────────────────────────────────────────

@app.post("/update-profile")
async def update_profile(req: UpdateProfileRequest):
    """
    Updates user details safely in MongoDB users collection
    """
    if db is None:
         raise HTTPException(status_code=500, detail="MongoDB not connected")
    
    update_data = {}
    if req.name:
        update_data["name"] = req.name
    
    if req.new_password:
        if not req.old_password:
            raise HTTPException(status_code=400, detail="Old password is required to change password.")
        
        try:
            user = db.users.find_one({"_id": ObjectId(req.user_id)})
        except:
            user = db.users.find_one({"_id": req.user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")
        
        if not verify_password(req.old_password, user.get("password", "")):
            raise HTTPException(status_code=400, detail="Incorrect old password.")
        
        update_data["password"] = hash_password(req.new_password)

    if not update_data:
        return {"success": True, "message": "No changes made."}

    try:
        try:
            uid = ObjectId(req.user_id)
        except:
            uid = req.user_id
        db.users.update_one(
            {"_id": uid}, 
            {"$set": {**update_data, "updatedAt": datetime.now()}}
        )
        return {"success": True, "message": "Profile updated successfully in MongoDB!"}
    except Exception as e:
        logger.error(f"Failed to update profile: {e}")
        raise HTTPException(status_code=500, detail="Database update failed")


# ──────────────────────────────────────────────
# ENDPOINT 3: Upload Resume
# ──────────────────────────────────────────────

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), user_id: str = Form("demo_user_123")):
    """
    Accepts a PDF resume, runs Resume Analyzer + ATS Optimizer,
    and returns the results along with a session_id for future calls.
    """
    # Validate file type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Generate session
    session_id = str(uuid.uuid4())
    file_path = TEMP_DIR / f"{session_id}.pdf"

    logger.info(f"[{session_id}] Uploading resume: {file.filename}")

    try:
        # Save uploaded file
        try:
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

        # Run Resume Analyzer
        logger.info(f"[{session_id}] Running Resume Analyzer...")
        try:
            resume_result, extracted_text = analyze_resume_with_text(str(file_path))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Resume analysis failed: {e}")

        # Run ATS Optimizer
        logger.info(f"[{session_id}] Running ATS Optimizer...")
        try:
            ats_result = ats_agent(resume_result)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"ATS optimization failed: {e}")

        # Create session
        sessions[session_id] = {
            "resume": resume_result,
            "ats": ats_result,
            "extracted_text": extracted_text,
            "questions": [],
            "answers": [],
            "qa_pairs": [],
            "evaluation": {},
            "feedback": {},
            "current_question_index": 0,
            "role": "",
            "created_at": datetime.now().isoformat(),
        }

        logger.info(f"[{session_id}] Session created successfully.")

        # Save to MongoDB
        if db is not None:
            try:
                db.resumes.insert_one({
                    "userId": user_id,
                    "fileName": file.filename,
                    "extractedText": extracted_text,
                    "resumeAnalysis": resume_result,
                    "atsAnalysis": ats_result,
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now(),
                })
                logger.info(f"[{session_id}] Data saved to MongoDB successfully.")
            except Exception as e:
                logger.error(f"[{session_id}] Failed to save to MongoDB: {e}")
                raise HTTPException(status_code=500, detail="Failed to save resume data")

        return {
            "session_id": session_id,
            "resume": resume_result,
            "ats": ats_result,
        }
    finally:
        _delete_temp_pdf(file_path)

# ──────────────────────────────────────────────
# ENDPOINT: Get Resumes
# ──────────────────────────────────────────────

@app.get("/resumes")
async def get_resumes(user_id: str):
    """
    Fetches all resumes for a specific user from MongoDB.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    
    try:
        # Sort by createdAt descending (-1)
        resumes_cursor = db.resumes.find({"userId": user_id}).sort("createdAt", -1)
        resumes = []
        for r in resumes_cursor:
            r["_id"] = str(r["_id"])
            resumes.append(r)
            
        return {"success": True, "resumes": resumes}
    except Exception as e:
        logger.error(f"Failed to fetch resumes: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch resumes")


# ──────────────────────────────────────────────
# ENDPOINT 2: Start Interview
# ──────────────────────────────────────────────
from bson.objectid import ObjectId

@app.post("/start-interview")
async def start_interview(req: StartInterviewRequest):
    """
    Generates interview questions based on resume + target role.
    Stores Interview in MongoDB.
    Returns the first question.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
        
    try:
        resume_doc = db.resumes.find_one({"_id": ObjectId(req.resume_id)})
    except:
        resume_doc = db.resumes.find_one({"_id": req.resume_id})
        
    if not resume_doc:
         raise HTTPException(status_code=404, detail="Resume not found")

    resume_analysis = resume_doc.get("resumeAnalysis", {})
    ats_analysis = resume_doc.get("atsAnalysis", {})

    interview_type = (req.interview_type or "all").strip().lower()
    valid_types = {"all", "hr", "behavioral", "project-based", "technical"}
    if interview_type == "project based":
        interview_type = "project-based"
    if interview_type in {"bhevorial", "behavioural"}:
        interview_type = "behavioral"
    if interview_type not in valid_types:
        interview_type = "all"

    num_questions = max(10, min(20, int(req.num_questions or 10)))
    if num_questions not in {10, 15, 20}:
        num_questions = 10

    logger.info(
        f"Starting interview for role: {req.role}, type: {interview_type}, "
        f"questions: {num_questions}, resume: {req.resume_id}"
    )

    # Generate questions using the LLM
    try:
        questions = generate_questions(resume_analysis, req.role, interview_type, num_questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {e}")

    if not questions:
        raise HTTPException(status_code=500, detail="No questions were generated by the LLM.")

    # Create Interview in MongoDB
    try:
        interview_res = db.interviews.insert_one({
            "userId": req.user_id,
            "resumeId": req.resume_id,
            "role": req.role,
            "interviewType": interview_type,
            "numQuestions": num_questions,
            "totalQuestions": len(questions),
            "status": "in-progress",
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        })
        interview_id = str(interview_res.inserted_id)
    except Exception as e:
        logger.error(f"Failed to save interview to DB: {e}")
        interview_id = str(uuid.uuid4()) # Fallback

    # Create session state tied to interview_id
    sessions[interview_id] = {
        "resume": resume_analysis,
        "ats": ats_analysis,
        "role": req.role,
        "interview_type": interview_type,
        "num_questions": num_questions,
        "questions": questions,
        "answers": [],
        "qa_pairs": [],
        "current_question_index": 0,
        "created_at": datetime.now().isoformat(),
    }

    logger.info(f"[{interview_id}] {len(questions)} questions generated.")

    return {
        "message": "Interview started",
        "session_id": interview_id,
        "interview_type": interview_type,
        "total_questions": len(questions),
        "question_number": 1,
        "question": questions[0],
    }


# ──────────────────────────────────────────────
# ENDPOINT 3: Answer Question
# ──────────────────────────────────────────────

@app.post("/answer-question")
async def answer_question(req: AnswerRequest):
    """
    Accepts an answer for the current question,
    stores it in MongoDB, and returns the next question.
    """
    session = _get_session(req.session_id)

    questions = session["questions"]
    index = session["current_question_index"]

    # Validate
    if not questions:
        raise HTTPException(status_code=400, detail="No interview in progress. Call /start-interview first.")

    if index >= len(questions):
        raise HTTPException(status_code=400, detail="Interview already completed. Call /get-feedback.")

    # Keep skipped answers as empty strings so every Q&A row is preserved.
    answer_text = req.answer.strip() if req.answer and req.answer.strip() else ""

    # Store answer
    current_question = questions[index]

    session["answers"].append(answer_text)
    session["qa_pairs"].append({
        "question": current_question,
        "answer": answer_text,
    })
    
    question_num = index + 1
    session["current_question_index"] += 1

    # Save answer to Mongo
    if db is not None:
        try:
            db.answers.insert_one({
                "interviewId": req.session_id,
                "question": current_question,
                "answer": answer_text,
                "questionNumber": question_num,
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            })
        except Exception as e:
            logger.error(f"Failed to save answer to DB: {e}")

    logger.info(f"[{req.session_id}] Answer {question_num}/{len(questions)} recorded.")

    # Check if more questions remain
    next_index = session["current_question_index"]

    if next_index < len(questions):
        return {
            "message": "Answer recorded",
            "question_number": next_index + 1,
            "total_questions": len(questions),
            "question": questions[next_index],
        }
    else:
        return {
            "message": "Interview completed",
            "total_questions": len(questions),
            "answers_recorded": len(session["answers"]),
        }


@app.post("/previous-question")
async def previous_question(req: PreviousQuestionRequest):
    """
    Go back to the previous question: removes the last recorded answer,
    decrements the question index, and returns that question with the prior answer text.
    """
    session = _get_session(req.session_id)
    questions = session.get("questions") or []

    if not questions:
        raise HTTPException(status_code=400, detail="No interview in progress.")

    idx = session["current_question_index"]
    if idx <= 0:
        raise HTTPException(status_code=400, detail="Already at the first question.")

    # Question number of the last recorded answer (matches `questionNumber` used in /answer-question)
    q_num_to_delete = len(session.get("answers") or [])

    prev_answer = ""
    if session.get("answers"):
        prev_answer = session["answers"].pop()
    if session.get("qa_pairs"):
        session["qa_pairs"].pop()

    if db is not None and q_num_to_delete > 0:
        try:
            db.answers.delete_one({"interviewId": req.session_id, "questionNumber": q_num_to_delete})
        except Exception as e:
            logger.error(f"Failed to remove answer from DB on go-back: {e}")

    session["current_question_index"] = idx - 1
    new_idx = session["current_question_index"]
    current_q = questions[new_idx]

    return {
        "message": "Moved to previous question",
        "question": current_q,
        "question_number": new_idx + 1,
        "total_questions": len(questions),
        "previous_answer": prev_answer if prev_answer != "Not answered" else "",
    }


# ──────────────────────────────────────────────
# ENDPOINT 4: Get Feedback
# ──────────────────────────────────────────────

@app.get("/get-feedback")
async def get_feedback(session_id: str):
    """
    Runs Evaluator + Feedback agents on the completed interview data.
    Returns evaluation scores and final career guidance.
    """
    session = _get_session(session_id)

    qa_pairs = session.get("qa_pairs", [])

    if not qa_pairs:
        raise HTTPException(
            status_code=400,
            detail="No interview data found. Complete an interview first.",
        )

    attempted_pairs = [p for p in qa_pairs if str(p.get("answer", "")).strip()]

    # If user didn't attempt any questions, still mark completed but score accordingly.
    if len(attempted_pairs) == 0:
        logger.info(f"[{session_id}] No attempted answers; generating not-attempted evaluation/feedback.")
        evaluation_result = {
            "overall_score": 0,
            "question_wise_feedback": [
                {
                    "question": p.get("question", ""),
                    "score": 0,
                    "strengths": [],
                    "mistakes": ["Not attempted"],
                    "improvements": ["Attempt the question and provide a structured answer (context → approach → example → result)."],
                }
                for p in qa_pairs
            ],
            "overall_strengths": [],
            "overall_weaknesses": ["No questions were attempted."],
            "final_suggestions": [
                "Try answering at least a few questions to unlock personalized evaluation and stronger recommendations.",
                "Use the voice button to respond faster and more naturally.",
            ],
        }
        feedback_result = {
            "final_assessment": "Not attempted — no answers were provided.",
            "skill_gaps": [],
            "strengths": [],
            "weak_areas": ["Interview participation", "Structured communication"],
            "learning_recommendations": ["Practice answering 3–5 common questions for your target role."],
            "project_suggestions": [],
            "career_roadmap": [
                "Step 1: Start a new mock interview for your target role.",
                "Step 2: Answer at least 3 questions (use voice if needed).",
                "Step 3: Review evaluation and iterate on weak areas.",
            ],
            "confidence_level": "Beginner",
        }
    else:
        # Run Evaluator Agent on attempted answers only
        logger.info(f"[{session_id}] Running Evaluator Agent...")
        try:
            evaluation_result = evaluator_agent({
                "qa_pairs": attempted_pairs,
            })
            evaluation_result = _normalize_evaluation_result(evaluation_result, attempted_pairs)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")

        # Run Feedback Agent
        logger.info(f"[{session_id}] Running Feedback Agent...")
        try:
            feedback_result = feedback_agent({
                "resume": session["resume"],
                "ats": session["ats"],
                "evaluation": evaluation_result,
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Feedback generation failed: {e}")

    # Ensure question-wise feedback contains one entry per question, including skipped ones.
    all_q_feedback = []
    attempted_feedback = list(evaluation_result.get("question_wise_feedback", []))
    attempted_idx = 0
    for p in qa_pairs:
        answer_text = str(p.get("answer", "")).strip()
        if answer_text:
            if attempted_idx < len(attempted_feedback):
                fb_entry = attempted_feedback[attempted_idx]
                attempted_idx += 1
                if not isinstance(fb_entry, dict):
                    fb_entry = {}
                if not fb_entry.get("question"):
                    fb_entry["question"] = p.get("question", "")
                all_q_feedback.append(fb_entry)
            else:
                all_q_feedback.append({
                    "question": p.get("question", ""),
                    "score": 0,
                    "strengths": [],
                    "mistakes": ["This answer needs more specific technical depth."],
                    "improvements": ["Include core concept, implementation steps, and a concrete example."],
                })
        else:
            all_q_feedback.append({
                "question": p.get("question", ""),
                "score": 0,
                "strengths": [],
                "mistakes": ["Not attempted"],
                "improvements": ["Attempt this question to receive personalized evaluation."],
            })
    evaluation_result["question_wise_feedback"] = all_q_feedback

    # Store in session
    session["evaluation"] = evaluation_result
    session["feedback"] = feedback_result

    # Save to MongoDB — always mark as completed
    if db is not None:
        try:
            try:
                iid = ObjectId(session_id)
            except:
                iid = session_id
            db.interviews.update_one({"_id": iid}, {"$set": {"status": "completed", "updatedAt": datetime.now()}})
            db.evaluations.insert_one({
                "interviewId": session_id,
                "evaluationData": json.dumps(evaluation_result),
                "createdAt": datetime.now()
            })
            db.feedbacks.insert_one({
                "interviewId": session_id,
                "resumeAnalysis": json.dumps(session["resume"]),
                "atsAnalysis": json.dumps(session["ats"]),
                "finalFeedback": json.dumps(feedback_result),
                "createdAt": datetime.now()
            })
        except Exception as e:
            logger.error(f"Failed to save final feedback: {e}")

    logger.info(f"[{session_id}] Feedback generated successfully.")

    return {
        "evaluation": evaluation_result,
        "feedback": feedback_result,
    }


# ──────────────────────────────────────────────
# ENDPOINT: List All Interviews for a User
# ──────────────────────────────────────────────

@app.get("/interviews")
async def list_interviews(user_id: str):
    """
    Returns all interviews for a user with evaluation, feedback, and answers.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    
    interviews_cursor = db.interviews.find({"userId": user_id}).sort("createdAt", -1)
    result = []
    
    for iv in interviews_cursor:
        iv_id = str(iv["_id"])
        
        # Get answers
        answers_cursor = db.answers.find({"interviewId": iv_id}).sort("questionNumber", 1)
        answers = []
        for a in answers_cursor:
            a["_id"] = str(a["_id"])
            answers.append(a)
        
        # Get evaluation
        evaluation_data = None
        eval_doc = db.evaluations.find_one({"interviewId": iv_id})
        if eval_doc and "evaluationData" in eval_doc:
            try:
                evaluation_data = json.loads(eval_doc["evaluationData"])
            except:
                pass
        
        # Get feedback
        feedback_data = None
        fb_doc = db.feedbacks.find_one({"interviewId": iv_id})
        if fb_doc and "finalFeedback" in fb_doc:
            try:
                feedback_data = json.loads(fb_doc["finalFeedback"])
            except:
                pass
        
        dt_str = "Unknown"
        if iv.get("createdAt"):
            dt_str = iv["createdAt"].strftime("%b %d, %Y")
        
        result.append({
            "id": iv_id,
            "role": iv.get("role", "Unknown Role"),
            "interviewType": iv.get("interviewType", "all"),
            "numQuestions": iv.get("numQuestions", iv.get("totalQuestions", 10)),
            "date": dt_str,
            "status": iv.get("status", "completed"),
            "totalQuestions": iv.get("totalQuestions", 0),
            "answers": answers,
            "evaluation": evaluation_data,
            "feedback": feedback_data,
        })
    
    return {"success": True, "interviews": result}


# ──────────────────────────────────────────────
# ENDPOINT 5: Dashboard Data
# ──────────────────────────────────────────────

@app.get("/dashboard-data")
async def dashboard_data(user_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
    
    resumes_count = db.resumes.count_documents({"userId": user_id})
    interviews_cursor = db.interviews.find({"userId": user_id}).sort("createdAt", -1)
    interviews = list(interviews_cursor)
    interviews_count = len(interviews)
    
    overall_scores = []
    recent_interviews = []
    
    for idx, iv in enumerate(interviews):
        iv_id = str(iv["_id"])
        eval_doc = db.evaluations.find_one({"interviewId": iv_id})
        score = None
        if eval_doc and "evaluationData" in eval_doc:
            try:
                eval_data = json.loads(eval_doc["evaluationData"])
                score = eval_data.get("overall_score")
                if score is not None:
                    if isinstance(score, (int, float)):
                        overall_scores.append(float(score))
                    elif isinstance(score, str) and score.isdigit():
                        overall_scores.append(float(score))
            except:
                pass
        
        if idx < 5:
            dt_str = "Unknown"
            if iv.get("createdAt"):
                dt_str = iv.get("createdAt").strftime("%b %d, %Y")
            recent_interviews.append({
                "id": iv_id,
                "role": iv.get("role", "Unknown Role"),
                "date": dt_str,
                "score": score,
                "status": iv.get("status", "in-progress")
            })
            
    avg_score = 0
    if overall_scores:
        avg_score = sum(overall_scores) / len(overall_scores)
        
    return {
        "success": True,
        "resumes_count": resumes_count,
        "interviews_count": interviews_count,
        "average_score": round(avg_score, 1),
        "recent_interviews": recent_interviews
    }


# ──────────────────────────────────────────────
# ENDPOINT 6: Interview Detail
# ──────────────────────────────────────────────

@app.get("/interview/{interview_id}")
async def get_interview_detail(interview_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not connected")
        
    try:
        iv = db.interviews.find_one({"_id": ObjectId(interview_id)})
    except:
        iv = db.interviews.find_one({"_id": interview_id})
        
    if not iv:
        raise HTTPException(status_code=404, detail="Interview not found")
        
    answers_cursor = db.answers.find({"interviewId": interview_id}).sort("questionNumber", 1)
    answers = []
    for a in answers_cursor:
        a["_id"] = str(a["_id"])
        answers.append(a)
        
    eval_doc = db.evaluations.find_one({"interviewId": interview_id})
    evaluation_data = None
    if eval_doc and "evaluationData" in eval_doc:
         try:
             evaluation_data = json.loads(eval_doc["evaluationData"])
         except:
             pass
             
    return {
        "success": True,
        "interview": {
            "id": str(iv["_id"]),
            "role": iv.get("role"),
            "interviewType": iv.get("interviewType", "all"),
            "numQuestions": iv.get("numQuestions", iv.get("totalQuestions", 10)),
            "status": iv.get("status")
        },
        "answers": answers,
        "evaluation": evaluation_data
    }


# ──────────────────────────────────────────────
# BONUS: Session Status
# ──────────────────────────────────────────────

@app.get("/session-status")
async def session_status(session_id: str):
    """Returns the current state of a session (for debugging / frontend sync)."""
    session = _get_session(session_id)

    return {
        "session_id": session_id,
        "role": session["role"],
        "total_questions": len(session["questions"]),
        "answers_recorded": len(session["answers"]),
        "current_question_index": session["current_question_index"],
        "has_evaluation": bool(session.get("evaluation")),
        "has_feedback": bool(session.get("feedback")),
        "created_at": session.get("created_at", ""),
    }
