import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './InterviewsPage.css';
import { speakText, cancelSpeech } from '../utils/speech';

const InterviewsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // If coming from resumes page to start a new interview
  const [resumeId] = useState(location.state?.resumeId || null);
  const [userId] = useState(location.state?.userId || null);

  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState('all');
  const [numQuestions, setNumQuestions] = useState(10);
  const [interviewState, setInterviewState] = useState(resumeId ? 'setup' : 'list'); // list | setup | interviewing | feedback
  
  const [sessionId, setSessionId] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedbackData, setFeedbackData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Voice (Speech-to-Text)
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [sttSupported, setSttSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');

  // Past interviews list
  const [pastInterviews, setPastInterviews] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const loadPastInterviews = async () => {
    setListLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('careermentor_user') || '{}');
      const uid = storedUser.id || 'demo_user_123';
      const res = await fetch(`http://localhost:8000/interviews?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPastInterviews(data.interviews || []);
        }
      }
    } catch (e) {
      console.error('Failed to load interviews:', e);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    if (!resumeId) {
      loadPastInterviews();
    }
  }, []);

  // Initialize SpeechRecognition once (best-effort).
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSttSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const t = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      setInterimTranscript(interimText.trim());
      if (finalText.trim()) {
        setAnswer((prev) => (prev ? `${prev.trim()} ${finalText.trim()}` : finalText.trim()));
      }
    };

    rec.onerror = () => {
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = rec;
    return () => {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const toggleListening = () => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      if (isListening) {
        rec.stop();
        setIsListening(false);
        setInterimTranscript('');
      } else {
        setError('');
        setInterimTranscript('');
        rec.start();
        setIsListening(true);
      }
    } catch {
      setIsListening(false);
    }
  };

  // TTS: speak each new AI question automatically while interviewing.
  useEffect(() => {
    if (interviewState !== 'interviewing') return;
    if (!currentQuestion) return;
    speakText(currentQuestion);
  }, [currentQuestion, interviewState]);

  const canSpeak = useMemo(() => typeof window !== 'undefined' && 'speechSynthesis' in window, []);

  const startInterview = async () => {
    if (!role.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/start-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          resume_id: resumeId,
          role,
          interview_type: interviewType,
          num_questions: Number(numQuestions),
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to start interview');
      
      setSessionId(data.session_id);
      setCurrentQuestion(data.question);
      setQuestionCount(data.question_number);
      setTotalQuestions(data.total_questions);
      setInterviewState('interviewing');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousQuestion = async () => {
    if (questionCount <= 1 || !sessionId) return;
    setLoading(true);
    setError('');
    cancelSpeech();
    try {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        setInterimTranscript('');
      }
    } catch {
      // ignore
    }
    try {
      const res = await fetch('http://localhost:8000/previous-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not go to previous question');
      setCurrentQuestion(data.question);
      setQuestionCount(data.question_number);
      setTotalQuestions(data.total_questions);
      setAnswer(data.previous_answer ?? '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (skip = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8000/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answer: skip ? '' : answer })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit answer');
      
      if (data.message === 'Interview completed') {
         await fetchFeedback();
         return;
      } else {
         setCurrentQuestion(data.question);
         setQuestionCount(data.question_number);
         setAnswer('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    setInterviewState('feedback');
    try {
       const res = await fetch(`http://localhost:8000/get-feedback?session_id=${sessionId}`);
       const data = await res.json();
       if (!res.ok) throw new Error(data.detail || "Failed to get feedback");
       setFeedbackData(data);
    } catch(err) {
       setError(err.message);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper to parse feedback
  const parseFeedback = (fb) => {
    if (!fb) return null;
    if (typeof fb === 'string') {
      try { return JSON.parse(fb); } catch { return fb; }
    }
    return fb;
  };

  // ─── RENDER: Past Interviews List ───
  if (interviewState === 'list') {
    return (
      <div className="interviews-page animate-fade-in">
        <div className="interview-flow-shell">
        <div className="page-header">
          <div className="page-title-group">
            <div className="page-icon icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
            <div>
              <h1 className="page-title">Interview History</h1>
              <p className="page-subtitle">View all your past mock interviews with detailed feedback.</p>
            </div>
          </div>
        </div>

        <div className="interview-flow-shell__content interviews-top-actions">
          <button
            className="btn btn-primary"
            style={{ background: 'var(--gradient-accent)' }}
            onClick={() => navigate('/resumes')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span style={{ marginLeft: '8px' }}>Start Interview</span>
          </button>
        </div>

        <div className="interviews-list interview-flow-shell__content">
          {listLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <span className="spinner" style={{ width: '30px', height: '30px' }}></span>
            </div>
          ) : pastInterviews.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
              <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No Interviews Yet</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Upload a resume and start a mock interview to see your history here.</p>
              <button className="btn btn-primary" onClick={() => navigate('/resumes')}>Go to Resumes</button>
            </div>
          ) : (
            pastInterviews.map(iv => {
              const isExpanded = expandedId === iv.id;
              const fb = parseFeedback(iv.feedback);
              const evalData = iv.evaluation;
              const overallScore = evalData?.overall_score;

              return (
                <div key={iv.id} className={`interview-card card ${isExpanded ? 'interview-card--expanded' : ''}`}>
                  {/* Header row - always visible */}
                  <div className="interview-card__header" onClick={() => toggleExpand(iv.id)}>
                    <div className="interview-card__info">
                      <h3 className="interview-card__role">{iv.role}</h3>
                      <div className="interview-card__meta">
                        <span>{iv.date}</span>
                        <span className="meta-dot">•</span>
                        <span>{iv.totalQuestions} questions</span>
                        <span className="meta-dot">•</span>
                        <span>{String(iv.interviewType || 'all')}</span>
                        <span className="meta-dot">•</span>
                        <span>{iv.answers?.length || 0} answered</span>
                      </div>
                    </div>
                    <div className="interview-card__right">
                      {overallScore != null && (
                        <div className="interview-card__score">
                          <span className="score-value">{overallScore}</span>
                          <span className="score-label">/100</span>
                        </div>
                      )}
                      <svg className={`expand-arrow ${isExpanded ? 'expand-arrow--open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="interview-card__detail animate-fade-in">
                      {/* Overall Feedback */}
                      {fb && typeof fb === 'object' && (
                        <div className="feedback-section">
                          <h4 className="section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                            Overall Feedback
                          </h4>
                          
                          {fb.final_assessment && (
                            <div className="feedback-block">
                              <h5>Assessment</h5>
                              <p>{fb.final_assessment}</p>
                            </div>
                          )}

                          <div className="feedback-grid">
                            {fb.strengths && fb.strengths.length > 0 && (
                              <div className="feedback-block feedback-block--success">
                                <h5>Strengths</h5>
                                <ul>{fb.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                              </div>
                            )}
                            {fb.skill_gaps && fb.skill_gaps.length > 0 && (
                              <div className="feedback-block feedback-block--warning">
                                <h5>Skill Gaps</h5>
                                <ul>{fb.skill_gaps.map((s, i) => <li key={i}>{s}</li>)}</ul>
                              </div>
                            )}
                            {fb.weak_areas && fb.weak_areas.length > 0 && (
                              <div className="feedback-block feedback-block--danger">
                                <h5>Areas for Improvement</h5>
                                <ul>{fb.weak_areas.map((s, i) => <li key={i}>{s}</li>)}</ul>
                              </div>
                            )}
                            {fb.learning_recommendations && fb.learning_recommendations.length > 0 && (
                              <div className="feedback-block feedback-block--info">
                                <h5>Recommendations</h5>
                                <ul>{fb.learning_recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Evaluation strengths/weaknesses if no feedback object */}
                      {evalData && !fb && (
                        <div className="feedback-section">
                          <h4 className="section-title">Evaluation</h4>
                          <div className="feedback-grid">
                            {evalData.strengths && (
                              <div className="feedback-block feedback-block--success">
                                <h5>Strengths</h5>
                                <ul>{evalData.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Question-wise Q&A */}
                      {iv.answers && iv.answers.length > 0 && (
                        <div className="qa-section">
                          <h4 className="section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            Question &amp; Answer Details
                          </h4>
                          <div className="qa-list">
                            {iv.answers.map((ans, idx) => {
                              let qFeedback = null;
                              if (evalData?.question_wise_feedback) {
                                qFeedback = evalData.question_wise_feedback[idx] || null;
                              }
                              const isSkipped = !String(ans.answer || '').trim();

                              return (
                                <div key={idx} className="qa-item">
                                  <div className="qa-item__question">
                                    <div className="q-badge">Q{ans.questionNumber || idx + 1}</div>
                                    <p>{ans.question}</p>
                                  </div>
                                  <div className={`qa-item__answer ${isSkipped ? 'qa-item__answer--skipped' : ''}`}>
                                    <strong>Your Answer:</strong> {isSkipped ? <em>Question was skipped</em> : ans.answer}
                                  </div>
                                  
                                  {qFeedback && (
                                    <div className="qa-item__feedback">
                                      {qFeedback.score !== undefined && (
                                        <span className="q-score">Score: {qFeedback.score}/10</span>
                                      )}
                                      {qFeedback.improvements && qFeedback.improvements.length > 0 && (
                                        <div className="q-feedback-list q-feedback-list--improve">
                                          <strong>Improvements:</strong>
                                          <ul>{qFeedback.improvements.map((imp, i) => <li key={i}>{imp}</li>)}</ul>
                                        </div>
                                      )}
                                      {qFeedback.mistakes && qFeedback.mistakes.length > 0 && (
                                        <div className="q-feedback-list q-feedback-list--mistakes">
                                          <strong>Mistakes:</strong>
                                          <ul>{qFeedback.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {!fb && !evalData && (!iv.answers || iv.answers.length === 0) && (
                        <p style={{ color: 'var(--color-text-secondary)', padding: '1rem 0' }}>No feedback data available for this interview.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Setup Interview ───
  if (interviewState === 'setup') {
    if (!resumeId) {
      return (
        <div className="interviews-page animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <h2 style={{ color: 'var(--color-text-primary)' }}>No Resume Selected</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', marginTop: '0.5rem' }}>Please select a resume from your Resumes tab to start a mock interview.</p>
          <button className="btn btn-primary" onClick={() => navigate('/resumes')}>Go to Resumes</button>
        </div>
      );
    }

    return (
      <div className="interviews-page animate-fade-in">
        <div className="interview-flow-shell">
        <div className="page-header">
          <div className="page-title-group">
            <div className="page-icon icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
            <div>
              <h1 className="page-title">Start Mock Interview</h1>
              <p className="page-subtitle">Enter the role you're preparing for.</p>
            </div>
          </div>
        </div>
        <div className="interviews-list interview-flow-shell__content">
          {error && <div className="error-banner">{error}</div>}
          <div className="card" style={{ padding: '2rem' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Target Role</h4>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Backend Developer, ML Engineer..." 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ marginBottom: '1.5rem' }}
            />
            <h4 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Interview Type</h4>
            <select
              className="input-field"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              style={{ marginBottom: '1.5rem' }}
            >
              <option value="all">All</option>
              <option value="hr">HR</option>
              <option value="behavioral">Behavioral</option>
              <option value="project-based">Project Based</option>
              <option value="technical">Technical</option>
            </select>
            <h4 style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Number of Questions</h4>
            <select
              className="input-field"
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              style={{ marginBottom: '1.5rem' }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
            <button 
              className="btn btn-primary" 
              style={{ background: '#5a67d8', color: 'white' }} 
              onClick={startInterview}
              disabled={loading || !role.trim()}
            >
              <span style={{ marginRight: '8px' }}>&rarr;</span> {loading ? 'Starting...' : 'Start Interview'}
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Interviewing ───
  if (interviewState === 'interviewing') {
    return (
      <div className="interviews-page animate-fade-in">
        <div className="interview-flow-shell">
        <div className="page-header">
          <div className="page-title-group">
            <div className="page-icon icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
            <div>
              <h1 className="page-title">Mock Interview</h1>
              <p className="page-subtitle">Answer the AI-generated questions. You can skip questions too.</p>
            </div>
          </div>
        </div>
        <div className="interviews-list interview-flow-shell__content">
          {error && <div className="error-banner">{error}</div>}
          <div className="card card-static animate-fade-in-up interview-card-full" style={{ padding: '2rem' }}>
            <div className="interview-q-toolbar">
              <button
                type="button"
                className="btn btn-secondary interview-back-btn"
                onClick={goToPreviousQuestion}
                disabled={loading || questionCount <= 1}
                title="Go to previous question"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Previous
              </button>
              <h3 className="interview-q-toolbar__title">Question {questionCount} of {totalQuestions}</h3>
              <span className="interview-q-toolbar__spacer" aria-hidden="true" />
            </div>
            
            <div className="question-box">
              <div className="question-box__label">Question</div>
              <div className="question-box__text">{currentQuestion}</div>
              <button
                type="button"
                className="question-box__listen"
                onClick={() => speakText(currentQuestion)}
                disabled={!canSpeak || !currentQuestion}
                title="Read question aloud"
              >
                <span aria-hidden="true">🔊</span> Listen
              </button>
            </div>

            <div className="voice-row">
              <h4 style={{ marginBottom: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Your Answer</h4>
              <button
                type="button"
                className={`voice-btn ${isListening ? 'active' : ''}`}
                onClick={toggleListening}
                disabled={!sttSupported || loading}
                title={!sttSupported ? 'Speech-to-text not supported in this browser' : (isListening ? 'Stop recording' : 'Answer with voice')}
              >
                <span className="voice-btn__icon" aria-hidden="true">
                  {isListening ? '⏺' : '🎙️'}
                </span>
                <span className="voice-btn__text">{isListening ? 'Listening…' : 'Voice'}</span>
              </button>
            </div>

            {isListening && interimTranscript && (
              <div className="voice-interim">
                <span className="voice-interim__label">Listening:</span> {interimTranscript}
              </div>
            )}

            <textarea 
              className="input-field answer-textarea" 
              rows="10"
              placeholder="Type your response here... or use the voice button to speak" 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              style={{ marginBottom: '1.5rem', resize: 'vertical' }}
            />
            <div className="interview-actions-row">
              <button 
                className="btn btn-primary" 
                style={{ background: 'var(--gradient-primary)' }} 
                onClick={() => submitAnswer(false)}
                disabled={loading || !answer.trim()}
              >
                {loading ? (
                  <span className="spinner" style={{ marginRight: '8px' }}></span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                )}
                {loading ? 'Submitting...' : 'Submit Answer'}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => submitAnswer(true)}
                disabled={loading}
              >
                Skip Question →
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ─── RENDER: Feedback ───
  if (interviewState === 'feedback') {
    return (
      <div className="interviews-page animate-fade-in">
        <div className="page-header">
          <div className="page-title-group">
            <div className="page-icon icon-purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
            <div>
              <h1 className="page-title">Interview Results</h1>
              <p className="page-subtitle">Review your performance and feedback.</p>
            </div>
          </div>
        </div>
        <div className="interviews-list" style={{ maxWidth: '800px' }}>
          {error && <div className="error-banner">{error}</div>}
          <div className="card animate-fade-in-up" style={{ padding: '2rem' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', borderTopColor: 'var(--color-brand-accent)' }}></span>
                <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Analyzing performance and generating feedback...</p>
              </div>
            ) : feedbackData ? (
              <div>
                <h2 style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Interview Complete
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', margin: '2rem 0' }}>
                  <div className="feedback-block feedback-block--success">
                    <h5>Overall Score</h5>
                    <span style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--color-brand-accent)' }}>
                      {feedbackData.evaluation?.overall_score ?? 'N/A'}<span style={{ fontSize: '1.5rem', color: 'var(--color-text-secondary)' }}>/100</span>
                    </span>
                  </div>
                  <div className="feedback-block feedback-block--success">
                    <h5>Strengths</h5>
                    <ul style={{ margin: 0, fontSize: '0.9rem' }}>
                       {(feedbackData.evaluation?.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Final Feedback */}
                {(() => {
                  let fb = parseFeedback(feedbackData.feedback);
                  if (fb && typeof fb === 'object') {
                    return (
                      <div className="feedback-section" style={{ marginBottom: '2rem' }}>
                        <h4 className="section-title">Final Feedback</h4>
                        {fb.final_assessment && (
                          <div className="feedback-block"><h5>Assessment</h5><p>{fb.final_assessment}</p></div>
                        )}
                        <div className="feedback-grid">
                          {fb.skill_gaps && fb.skill_gaps.length > 0 && (
                            <div className="feedback-block feedback-block--warning"><h5>Skill Gaps</h5><ul>{fb.skill_gaps.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                          )}
                          {fb.weak_areas && fb.weak_areas.length > 0 && (
                            <div className="feedback-block feedback-block--danger"><h5>Areas to Improve</h5><ul>{fb.weak_areas.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                          )}
                          {fb.learning_recommendations && fb.learning_recommendations.length > 0 && (
                            <div className="feedback-block feedback-block--info"><h5>Recommendations</h5><ul>{fb.learning_recommendations.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return fb ? <p style={{ lineHeight: '1.6', color: 'var(--color-text-primary)' }}>{typeof fb === 'string' ? fb : JSON.stringify(fb)}</p> : null;
                })()}

                {feedbackData.evaluation?.question_wise_feedback?.length > 0 && (
                  <div className="feedback-section" style={{ marginBottom: '2rem' }}>
                    <h4 className="section-title">Question-wise Evaluation</h4>
                    <div className="qa-list">
                      {feedbackData.evaluation.question_wise_feedback.map((q, idx) => (
                        <div key={idx} className="qa-item">
                          <div className="qa-item__question">
                            <div className="q-badge">Q{idx + 1}</div>
                            <p>{q.question || `Question ${idx + 1}`}</p>
                          </div>
                          <div className="qa-item__answer">
                            <strong>Score:</strong> {q.score != null ? `${q.score}/10` : 'N/A'}
                          </div>
                          <div className="qa-item__feedback">
                            {q.improvements?.length > 0 && (
                              <div className="q-feedback-list q-feedback-list--improve">
                                <strong>Improvements:</strong>
                                <ul>{q.improvements.map((imp, i) => <li key={i}>{imp}</li>)}</ul>
                              </div>
                            )}
                            {q.mistakes?.length > 0 && (
                              <div className="q-feedback-list q-feedback-list--mistakes">
                                <strong>Mistakes:</strong>
                                <ul>{q.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Return to Dashboard</button>
              </div>
            ) : (
              <p>Your feedback is loading. Please wait...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InterviewsPage;
