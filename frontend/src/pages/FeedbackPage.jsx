import React, { useEffect, useMemo, useState } from 'react';
import './FeedbackPage.css';

const FeedbackPage = () => {
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState([]);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('careermentor_user') || '{}');
      const userId = storedUser.id || 'demo_user_123';
      const res = await fetch(`http://localhost:8000/resumes?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setResumes(data.resumes || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const stats = useMemo(() => {
    const scores = resumes
      .map((r) => Number(r?.atsAnalysis?.ats_score))
      .filter((n) => Number.isFinite(n));
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

    const missing = new Map();
    const improvements = new Map();
    for (const r of resumes) {
      for (const kw of r?.atsAnalysis?.missing_keywords || []) missing.set(kw, (missing.get(kw) || 0) + 1);
      for (const imp of r?.atsAnalysis?.improvements || []) improvements.set(imp, (improvements.get(imp) || 0) + 1);
    }
    const topMissing = [...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    const topImprovements = [...improvements.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      avgAts: avg,
      resumesCount: resumes.length,
      topMissing,
      topImprovements,
    };
  }, [resumes]);

  return (
    <div className="fb-page animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-pink">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Feedback</h1>
            <p className="page-subtitle">Overall feedback across all your resumes — patterns, gaps, and what to fix next.</p>
          </div>
        </div>
      </div>

      <div className="fb-top">
        <div className="fb-hero card">
          <div className="fb-hero__left">
            <div className="badge badge-primary">Overview</div>
            <div className="fb-hero__title">Your progress at a glance</div>
            <div className="fb-hero__sub">
              {stats.resumesCount === 0
                ? 'Upload resumes to generate feedback insights.'
                : 'We aggregate ATS signals to show your biggest opportunities.'}
            </div>
          </div>
          <div className="fb-hero__right">
            <div className="fb-metric">
              <div className="fb-metric__k">Resumes</div>
              <div className="fb-metric__v">{stats.resumesCount}</div>
            </div>
            <div className="fb-metric">
              <div className="fb-metric__k">Avg ATS</div>
              <div className="fb-metric__v">{stats.avgAts ?? 'N/A'}</div>
            </div>
          </div>
          <div className="fb-hero__glow" aria-hidden="true"></div>
        </div>

        <div className="fb-actions card card-static">
          <button type="button" className="btn btn-primary" style={{ background: 'var(--gradient-accent)' }} onClick={loadResumes}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
          <span className="spinner" style={{ width: '30px', height: '30px' }}></span>
        </div>
      ) : resumes.length === 0 ? (
        <div className="empty-state">
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No feedback yet</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>Upload a resume to generate ATS analysis and aggregated feedback.</p>
        </div>
      ) : (
        <div className="fb-grid">
          <div className="fb-card card">
            <div className="fb-card__head">
              <div>
                <h3 className="settings-card__title" style={{ marginBottom: 0 }}>Top Missing Keywords</h3>
                <p className="settings-card__subtitle">These appear most often across your resumes.</p>
              </div>
              <span className="settings-chip">ATS</span>
            </div>
            <div className="tag-list" style={{ marginTop: 12 }}>
              {stats.topMissing.map(([kw, n]) => (
                <span key={kw} className="tag tag--missing">{kw} <span className="fb-pill">{n}</span></span>
              ))}
            </div>
          </div>

          <div className="fb-card card">
            <div className="fb-card__head">
              <div>
                <h3 className="settings-card__title" style={{ marginBottom: 0 }}>Most Common Improvements</h3>
                <p className="settings-card__subtitle">High-impact changes you can apply repeatedly.</p>
              </div>
              <span className="settings-chip">Action</span>
            </div>
            <ul className="fb-list">
              {stats.topImprovements.map(([imp, n]) => (
                <li key={imp}>
                  <span className="fb-bullet"></span>
                  <span>{imp}</span>
                  <span className="fb-count">{n}x</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="fb-card card fb-card--wide">
            <div className="fb-card__head">
              <div>
                <h3 className="settings-card__title" style={{ marginBottom: 0 }}>Resume-by-resume summary</h3>
                <p className="settings-card__subtitle">Quickly compare scores and see what changed.</p>
              </div>
              <span className="settings-chip">List</span>
            </div>

            <div className="fb-resume-list">
              {resumes.map((r) => (
                <div key={r._id} className="fb-row">
                  <div className="fb-row__left">
                    <div className="fb-row__title">{r.fileName || 'resume.pdf'}</div>
                    <div className="fb-row__sub">
                      {(r?.atsAnalysis?.formatting_feedback || '').slice(0, 90) || 'No formatting feedback available.'}
                      {(r?.atsAnalysis?.formatting_feedback || '').length > 90 ? '…' : ''}
                    </div>
                  </div>
                  <div className="fb-row__right">
                    <div className="fb-score-badge">
                      ATS {r?.atsAnalysis?.ats_score ?? 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackPage;

