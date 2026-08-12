import React, { useEffect, useMemo, useState } from 'react';
import './AtsAnalysisPage.css';
import { API_BASE_URL } from "../services/api";

const AtsAnalysisPage = () => {
  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [expanded, setExpanded] = useState(true);

  const loadResumes = async () => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem('careermentor_user') || '{}');
      const userId = storedUser.id?._id || storedUser?.id;
      const res = await fetch(`${API_BASE_URL}/resumes?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const list = data.resumes || [];
          setResumes(list);
          if (!selectedId && list[0]?._id) setSelectedId(list[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedResume = useMemo(
    () => resumes.find((r) => r._id === selectedId) || null,
    [resumes, selectedId]
  );

  const ats = selectedResume?.atsAnalysis || null;
  const analysis = selectedResume?.resumeAnalysis || null;

  return (
    <div className="ats-page animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div>
            <h1 className="page-title">ATS Analysis</h1>
            <p className="page-subtitle">Your resume’s ATS report, improvements, and keyword insights — all in one place.</p>
          </div>
        </div>
      </div>

      <div className="ats-topbar card card-static">
        <div className="ats-topbar__left">
          <div className="ats-topbar__label">Select resume</div>
          <select
            className="ats-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loading || resumes.length === 0}
          >
            {resumes.length === 0 ? (
              <option value="">No resumes uploaded</option>
            ) : (
              resumes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.fileName || 'resume.pdf'}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="ats-topbar__right">
          <button type="button" className="btn btn-secondary" onClick={() => setExpanded((v) => !v)} disabled={!selectedResume}>
            {expanded ? 'Collapse report' : 'Expand report'}
          </button>
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
          <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No resumes found</h3>
          <p style={{ color: 'var(--color-text-secondary)' }}>Upload a resume first to see ATS analysis.</p>
        </div>
      ) : (
        <div className="ats-grid">
          <div className="ats-summary card">
            <div className="ats-summary__top">
              <div>
                <div className="badge badge-primary">Score</div>
                <div className="ats-score">{ats?.ats_score ?? 'N/A'}</div>
                <div className="ats-score__hint">Higher score means better ATS compatibility.</div>
              </div>
              <div className="ats-score-ring" aria-hidden="true">
                <div className="ats-score-ring__inner"></div>
              </div>
            </div>

            <div className="ats-mini">
              <div className="ats-mini__item">
                <div className="ats-mini__label">Missing keywords</div>
                <div className="ats-mini__value">{(ats?.missing_keywords || []).length}</div>
              </div>
              <div className="ats-mini__item">
                <div className="ats-mini__label">Skills found</div>
                <div className="ats-mini__value">{(analysis?.skills || []).length}</div>
              </div>
              <div className="ats-mini__item">
                <div className="ats-mini__label">Improvements</div>
                <div className="ats-mini__value">{(ats?.improvements || []).length}</div>
              </div>
            </div>
          </div>

          <div className="ats-report card">
            <div className="ats-report__head">
              <h3 className="settings-card__title" style={{ marginBottom: 0 }}>ATS Report</h3>
              <span className="settings-chip">Resume</span>
            </div>

            {!ats && (
              <div className="ats-empty">
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  No ATS report found for this resume yet. Upload again or refresh after analysis completes.
                </p>
              </div>
            )}

            {ats && expanded && (
              <div className="ats-report__body">
                <div className="ats-block">
                  <h4>Missing Keywords</h4>
                  <div className="tag-list">
                    {(ats.missing_keywords || []).map((kw, i) => (
                      <span key={i} className="tag tag--missing">{kw}</span>
                    ))}
                    {(!ats.missing_keywords || ats.missing_keywords.length === 0) && (
                      <span className="text-muted">None detected</span>
                    )}
                  </div>
                </div>

                {ats.optimized_summary && (
                  <div className="ats-block">
                    <h4>Optimized Summary</h4>
                    <p className="ats-text">{ats.optimized_summary}</p>
                  </div>
                )}

                <div className="ats-split">
                  {ats.keyword_density_feedback && (
                    <div className="ats-panel ats-panel--info">
                      <h4>Keyword density</h4>
                      <p>{ats.keyword_density_feedback}</p>
                    </div>
                  )}
                  {ats.formatting_feedback && (
                    <div className="ats-panel ats-panel--accent">
                      <h4>Formatting</h4>
                      <p>{ats.formatting_feedback}</p>
                    </div>
                  )}
                </div>

                {ats.improvements && ats.improvements.length > 0 && (
                  <div className="ats-block">
                    <h4>Recommended Improvements</h4>
                    <ul className="ats-list">
                      {ats.improvements.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AtsAnalysisPage;

