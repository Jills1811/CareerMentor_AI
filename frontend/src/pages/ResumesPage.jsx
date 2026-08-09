import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResumesPage.css';

const ResumesPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [resumesList, setResumesList] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const loadResumes = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('careermentor_user') || '{}');
      const userId = storedUser.id || 'demo_user_123';
      const res = await fetch(`http://localhost:8000/resumes?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setResumesList(data.resumes || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const storedUser = JSON.parse(localStorage.getItem('careerlens_user') || '{}');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', storedUser.id || 'demo_user_123');

    try {
      const response = await fetch('http://localhost:8000/upload-resume', {
        method: 'POST',
        body: formData,
      });
      await response.json();
      // Reload the list — the new one will appear at top
      loadResumes();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="resumes-page animate-fade-in">
      <div className="page-header resumes-header">
        <div className="page-title-group">
          <div className="page-icon icon-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div>
            <h1 className="page-title">My Uploaded Resumes</h1>
            <p className="page-subtitle">Upload your resume and track ATS analysis, interviews, and improvements.</p>
          </div>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="application/pdf"
          onChange={handleFileChange}
        />

        <button 
          className="btn btn-primary" 
          style={{ background: 'var(--gradient-primary)' }}
          onClick={handleUploadClick}
          disabled={uploading}
        >
          {uploading ? (
            <span className="spinner"></span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          )}
          <span style={{ marginLeft: '8px' }}>{uploading ? 'Analyzing...' : 'Upload PDF'}</span>
        </button>
      </div>

      <div className="resumes-list">
        {resumesList.length === 0 && (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>No Resumes Yet</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>Upload your first resume to get AI analysis.</p>
          </div>
        )}

        {resumesList.map((resume) => {
          const formattedDate = new Date(resume.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          const isExpanded = expandedId === resume._id;
          const ats = resume.atsAnalysis;
          const analysis = resume.resumeAnalysis;

          return (
            <div key={resume._id} className={`resume-card card ${isExpanded ? 'resume-card--expanded' : ''}`}>
              {/* Header row */}
              <div className="resume-card__header" onClick={() => toggleExpand(resume._id)}>
                <div className="resume-card__left">
                  <div className="resume-icon-wrapper">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="resume-info">
                    <h3 className="resume-title">{resume.fileName || 'resume.pdf'}</h3>
                    <p className="resume-meta">
                      Uploaded {formattedDate} <span className="meta-dot">•</span> <span className="resume-ats text-gradient">ATS: {ats?.ats_score || 'N/A'}</span>
                    </p>
                  </div>
                </div>

                <div className="resume-card__right">
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const storedUser = JSON.parse(localStorage.getItem('careermentor_user') || '{}');
                      navigate('/interviews', { state: { resumeId: resume._id, userId: storedUser.id || 'demo_user_123' }});
                    }}
                  >
                    Interview
                  </button>
                  <svg className={`expand-arrow ${isExpanded ? 'expand-arrow--open' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>

              {/* Expanded ATS detail */}
              {isExpanded && (
                <div className="resume-card__detail animate-fade-in">
                  {/* Skills & Missing Keywords */}
                  <div className="ats-grid">
                    <div className="ats-block">
                      <h4>Skills Found</h4>
                      <div className="tag-list">
                        {(analysis?.skills || []).map((skill, i) => (
                          <span key={i} className="tag tag--skill">{skill}</span>
                        ))}
                        {(!analysis?.skills || analysis.skills.length === 0) && <span className="text-muted">No skills extracted</span>}
                      </div>
                    </div>
                    <div className="ats-block">
                      <h4>Missing Keywords</h4>
                      <div className="tag-list">
                        {(ats?.missing_keywords || []).map((kw, i) => (
                          <span key={i} className="tag tag--missing">{kw}</span>
                        ))}
                        {(!ats?.missing_keywords || ats.missing_keywords.length === 0) && <span className="text-muted">None detected</span>}
                      </div>
                    </div>
                  </div>

                  {/* Optimized Summary */}
                  {ats?.optimized_summary && (
                    <div className="ats-section">
                      <h4>Optimized Summary</h4>
                      <p className="ats-text-block">{ats.optimized_summary}</p>
                    </div>
                  )}

                  {/* Improvements */}
                  {ats?.improvements && ats.improvements.length > 0 && (
                    <div className="ats-section">
                      <h4>Recommended Improvements</h4>
                      <ul className="ats-list">
                        {ats.improvements.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Keyword Density & Formatting Feedback */}
                  <div className="ats-grid">
                    {ats?.keyword_density_feedback && (
                      <div className="ats-block ats-block--info">
                        <h4>Keyword Density Feedback</h4>
                        <p>{ats.keyword_density_feedback}</p>
                      </div>
                    )}
                    {ats?.formatting_feedback && (
                      <div className="ats-block ats-block--accent">
                        <h4>Formatting Feedback</h4>
                        <p>{ats.formatting_feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Experience & Education from analysis */}
                  {analysis?.experience && analysis.experience.length > 0 && (
                    <div className="ats-section">
                      <h4>Experience</h4>
                      <ul className="ats-list">
                        {analysis.experience.map((exp, idx) => (
                          <li key={idx}>{typeof exp === 'string' ? exp : JSON.stringify(exp)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis?.education && analysis.education.length > 0 && (
                    <div className="ats-section">
                      <h4>Education</h4>
                      <ul className="ats-list">
                        {analysis.education.map((edu, idx) => (
                          <li key={idx}>{typeof edu === 'string' ? edu : JSON.stringify(edu)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ResumesPage;
