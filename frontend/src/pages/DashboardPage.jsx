import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DashboardPage.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('User');
  const [dashboardData, setDashboardData] = useState({
    resumes_count: 0,
    interviews_count: 0,
    average_score: 0,
    recent_interviews: []
  });
  
  const [loading, setLoading] = useState(true);
  const [selectedInterviewId, setSelectedInterviewId] = useState(null);
  const [interviewDetail, setInterviewDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      const storedUser = JSON.parse(localStorage.getItem('careerlens_user') || '{}');
      const userId = storedUser.id || 'demo_user_123';
      setUserName(storedUser.name || 'User');
      
      try {
        const res = await fetch(`http://localhost:8000/dashboard-data?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setDashboardData(data);
          }
        }
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const openInterviewDetail = async (id) => {
    setSelectedInterviewId(id);
    setDetailLoading(true);
    setInterviewDetail(null);
    try {
      const res = await fetch(`http://localhost:8000/interview/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInterviewDetail(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedInterviewId(null);
    setInterviewDetail(null);
  };

  if (selectedInterviewId) {
    return (
      <div className="dashboard-page animate-fade-in" style={{ paddingBottom: '3rem' }}>
        <button className="btn btn-secondary" onClick={closeDetail} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to Dashboard
        </button>

        {detailLoading ? (
           <div style={{ textAlign: 'center', padding: '4rem' }}>
             <span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', borderTopColor: 'var(--color-brand-accent)' }}></span>
             <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Loading interview details...</p>
           </div>
        ) : interviewDetail ? (
           <div className="card" style={{ padding: '2rem' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--color-text-primary)' }}>{interviewDetail.interview?.role || 'Interview Details'}</h2>
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Status: <span style={{ color: '#10b981', fontWeight: '500' }}>Completed</span></span>
                  </div>
                </div>
                {interviewDetail.evaluation?.overall_score != null && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-brand-accent)', lineHeight: 1 }}>{interviewDetail.evaluation.overall_score}%</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Overall Score</div>
                  </div>
                )}
             </div>

             <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>Q&A and Improvements</h3>
             
             {interviewDetail.answers && interviewDetail.answers.length > 0 ? (
               <div style={{ display: 'grid', gap: '2rem' }}>
                 {interviewDetail.answers.map((ans, idx) => {
                    // Match with evaluation feedback if available
                    let feedback = null;
                    if (interviewDetail.evaluation?.question_wise_feedback) {
                       feedback = interviewDetail.evaluation.question_wise_feedback.find(f => 
                          f.question && ans.question && (f.question.includes(ans.question.substring(0, 20)) || ans.question.includes(f.question.substring(0, 20)))
                       ) || interviewDetail.evaluation.question_wise_feedback[idx];
                    }

                    return (
                      <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                           <div style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>Q{ans.questionNumber}</div>
                           <p style={{ margin: 0, fontWeight: '500', fontSize: '1.05rem', color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{ans.question}</p>
                         </div>
                         <div style={{ marginLeft: '45px', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                           <strong style={{ color: 'var(--color-text-primary)' }}>Your Answer: </strong> {ans.answer}
                         </div>
                         
                         {feedback && (
                           <div style={{ marginLeft: '45px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                             {feedback.improvements && feedback.improvements.length > 0 && (
                               <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                 <h4 style={{ color: '#60a5fa', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                   Improvements
                                 </h4>
                                 <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                   {feedback.improvements.map((imp, i) => <li key={i} style={{ marginBottom: '4px' }}>{imp}</li>)}
                                 </ul>
                               </div>
                             )}
                             {feedback.mistakes && feedback.mistakes.length > 0 && (
                               <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                 <h4 style={{ color: '#f87171', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                   Mistakes
                                 </h4>
                                 <ul style={{ paddingLeft: '1rem', margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                   {feedback.mistakes.map((mis, i) => <li key={i} style={{ marginBottom: '4px' }}>{mis}</li>)}
                                 </ul>
                               </div>
                             )}
                           </div>
                         )}
                      </div>
                    )
                 })}
               </div>
             ) : (
                <p style={{ color: 'var(--color-text-secondary)' }}>No answers recorded for this interview.</p>
             )}
           </div>
        ) : (
           <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>Failed to load details.</p>
        )}
      </div>
    );
  }

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          Welcome back, <span className="text-gradient">{userName}</span>
        </h1>
        <p className="dashboard-subtitle">
          Keep pushing forward — every interview makes you sharper.
        </p>
      </div>

      {loading ? (
         <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <span className="spinner" style={{ width: '30px', height: '30px' }}></span>
         </div>
      ) : (
        <>
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-card__content">
                <p className="stat-label">Total Interviews</p>
                <h3 className="stat-number">{dashboardData.interviews_count}</h3>
              </div>
              <div className="stat-icon icon-purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__content">
                <p className="stat-label">Resumes Uploaded</p>
                <h3 className="stat-number">{dashboardData.resumes_count}</h3>
              </div>
              <div className="stat-icon icon-pink">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card__content">
                <p className="stat-label">Average Score</p>
                <h3 className="stat-number">{dashboardData.average_score != null ? `${dashboardData.average_score}%` : 'N/A'}</h3>
              </div>
              <div className="stat-icon icon-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
            </div>
          </div>

          <div className="dashboard-actions">
            <button className="btn btn-primary" onClick={() => navigate('/resumes')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <span style={{ marginLeft: '8px' }}>Upload Resume</span>
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/resumes')} style={{ background: 'var(--gradient-accent)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <span style={{ marginLeft: '8px' }}>Start Interview</span>
            </button>
          </div>

          <div className="recent-list-container card">
            <div className="recent-list-header">
              <h3>Recent Interviews</h3>
              <Link to="/interviews" onClick={(e) => { e.preventDefault(); navigate('/resumes') }} className="view-all-link">View all 
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </Link>
            </div>
            
            <div className="recent-items">
              {dashboardData.recent_interviews.length === 0 ? (
                 <p style={{ color: 'var(--color-text-secondary)', padding: '1rem 0' }}>No recent interviews yet.</p>
              ) : (
                dashboardData.recent_interviews.map(iv => (
                  <div key={iv.id} className="recent-item" onClick={() => openInterviewDetail(iv.id)} style={{ cursor: 'pointer' }}>
                    <div className="recent-item__info">
                      <h4 className="item-title">{iv.role}</h4>
                      <p className="item-date">{iv.date}</p>
                    </div>
                    {iv.score != null ? (
                       <div className="recent-item__score text-accent">{iv.score}%</div>
                    ) : (
                       <div className="recent-item__score" style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>View →</div>
                    )}
                    <svg className="item-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
