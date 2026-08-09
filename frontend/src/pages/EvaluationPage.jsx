import React, { useEffect, useMemo, useState } from 'react';
import './EvaluationPage.css';

const EvaluationPage = () => {
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [query, setQuery] = useState('');

  const loadInterviews = async () => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('careermentor_user') || '{}');
      const uid = storedUser.id || 'demo_user_123';
      const res = await fetch(`http://localhost:8000/interviews?user_id=${uid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setInterviews(data.interviews || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterviews();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return interviews;
    return interviews.filter((iv) => (iv.role || '').toLowerCase().includes(q));
  }, [interviews, query]);

  const toggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="eval-page animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 12l2 2 6-6"></path>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Interview Evaluation</h1>
            <p className="page-subtitle">Question-wise evaluation for all interviews — strengths, mistakes, and improvements.</p>
          </div>
        </div>
      </div>

      <div className="eval-toolbar card card-static">
        <div className="eval-search">
          <div className="input-group" style={{ width: '100%' }}>
            <label className="input-label" htmlFor="eval-search">Search by role</label>
            <input
              id="eval-search"
              className="input-field"
              placeholder="e.g. Frontend Developer"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="eval-actions">
          <button type="button" className="btn btn-primary" style={{ background: 'var(--gradient-accent)' }} onClick={loadInterviews}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <span className="spinner" style={{ width: '30px', height: '30px' }}></span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No evaluations yet</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>Start an interview to generate evaluation data.</p>
        </div>
      ) : (
        <div className="eval-list">
          {filtered.map((iv) => {
            const isOpen = expandedId === iv.id;
            const evalData = iv.evaluation || null;
            const qwf = evalData?.question_wise_feedback || [];
            const answers = iv.answers || [];
            const questionLines = Array.from({ length: Math.max(qwf.length, answers.length) }, (_, idx) => {
              const evalItem = qwf[idx] || {};
              const answerItem = answers[idx] || {};
              return {
                question: evalItem.question || answerItem.question || `Question ${idx + 1}`,
                answer: String(answerItem.answer || ''),
                improvements: evalItem.improvements || [],
                mistakes: evalItem.mistakes || [],
                expected_answer: evalItem.expected_answer,
                score: evalItem.score,
              };
            });
            return (
              <div key={iv.id} className={`eval-card card ${isOpen ? 'eval-card--open' : ''}`}>
                <button type="button" className="eval-card__head" onClick={() => toggle(iv.id)}>
                  <div className="eval-card__left">
                    <div className="eval-role">{iv.role || 'Interview'}</div>
                    <div className="eval-meta">
                      <span>{iv.date}</span>
                      <span className="meta-dot">•</span>
                      <span>{qwf.length || iv.totalQuestions || 0} questions</span>
                    </div>
                  </div>
                  <div className="eval-card__right">
                    {evalData?.overall_score != null && (
                      <div className="eval-score">
                        <span className="eval-score__v">{evalData.overall_score}</span>
                        <span className="eval-score__l">/100</span>
                      </div>
                    )}
                    <svg className={`expand-arrow ${isOpen ? 'expand-arrow--open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="eval-card__body animate-fade-in">
                    {questionLines.length === 0 ? (
                      <p style={{ color: 'var(--color-text-secondary)' }}>
                        No question-wise evaluation found for this interview.
                      </p>
                    ) : (
                      <div className="eval-q-list">
                        {questionLines.map((q, idx) => (
                          <div key={idx} className="eval-q card card-static">
                            <div className="eval-q__top">
                              <div className="badge badge-primary">Q{idx + 1}</div>
                              <div className="eval-q__q">{q.question || 'Question'}</div>
                            </div>
                            <div className="eval-box eval-box--neutral" style={{ marginBottom: '1rem' }}>
                              <div className="eval-box__t">Your answer</div>
                              <p>{q.answer.trim() ? q.answer : '"" (not answered)'}</p>
                            </div>
                            <div className="eval-q__grid">
                              {q.improvements?.length > 0 && (
                                <div className="eval-box eval-box--info">
                                  <div className="eval-box__t">Improvements</div>
                                  <ul>{q.improvements.map((it, i) => <li key={i}>{it}</li>)}</ul>
                                </div>
                              )}
                              {q.mistakes?.length > 0 && (
                                <div className="eval-box eval-box--danger">
                                  <div className="eval-box__t">Mistakes</div>
                                  <ul>{q.mistakes.map((it, i) => <li key={i}>{it}</li>)}</ul>
                                </div>
                              )}
                              {q.expected_answer && (
                                <div className="eval-box eval-box--accent">
                                  <div className="eval-box__t">Expected answer</div>
                                  <p>{q.expected_answer}</p>
                                </div>
                              )}
                              {q.score != null && (
                                <div className="eval-box eval-box--neutral">
                                  <div className="eval-box__t">Score</div>
                                  <div className="eval-score-big">{q.score}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EvaluationPage;

