import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing">
      {/* ===== HERO SECTION ===== */}
      <section className="hero" style={{ paddingBottom: '0', minHeight: 'auto' }}>
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1"></div>
          <div className="hero__orb hero__orb--2"></div>
        </div>

        <div className="container hero__content" style={{ marginTop: '10vh' }}>
          <p
            className="animate-fade-in-up"
            style={{
              marginBottom: '1rem',
              color: 'var(--color-text-secondary)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            CareerLens AI
          </p>
          <h1 className="hero__title animate-fade-in-up animate-delay-1" style={{ fontSize: '4rem', fontWeight: 'bold' }}>
            Turn Preparation Into<br />
            <span className="text-gradient">Interview Performance</span>
          </h1>

          <p className="hero__subtitle animate-fade-in-up animate-delay-2" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
            CareerLens AI transforms your resume into a personalized practice engine: role-specific interviews, deep question-wise evaluation, ATS insights, and a clear roadmap to get hired faster.
          </p>

          <div className="hero__actions animate-fade-in-up animate-delay-3" style={{ justifyContent: 'center', marginBottom: '4rem' }}>
            <Link
              to="/login"
              className="btn btn-secondary btn-lg"
              style={{ borderRadius: 'var(--radius-md)', padding: '12px 32px' }}
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="btn btn-primary btn-lg"
              id="hero-cta"
              style={{ borderRadius: 'var(--radius-md)', padding: '12px 32px' }}
            >
              Signup
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 3 CARDS SECTION ===== */}
      <section className="section features" id="features" style={{ paddingTop: '2rem' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="features__grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-lg)' }}>
            
            <div className="feature-card card text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', background: '#111116' }}>
              <div className="feature-card__icon feature-card__icon--purple" style={{ marginBottom: '1rem', width: '48px', height: '48px', borderRadius: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </div>
              <h3 className="feature-card__title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Precision Mock Interviews</h3>
              <p className="feature-card__desc" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                Choose interview type (All, HR, Behavioral, Project-Based, Technical) and practice with 10, 15, or 20 questions.
              </p>
            </div>

            <div className="feature-card card text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', background: '#111116' }}>
              <div className="feature-card__icon feature-card__icon--blue" style={{ marginBottom: '1rem', width: '48px', height: '48px', borderRadius: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3 className="feature-card__title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Resume + ATS Intelligence</h3>
              <p className="feature-card__desc" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                Instantly uncover missing keywords, improve structure, and make your resume recruiter-ready.
              </p>
            </div>

            <div className="feature-card card text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1.5rem', background: '#111116' }}>
              <div className="feature-card__icon feature-card__icon--pink" style={{ marginBottom: '1rem', width: '48px', height: '48px', borderRadius: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h3 className="feature-card__title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Actionable Growth Reports</h3>
              <p className="feature-card__desc" style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                Get question-by-question scores, mistakes, and improvement tips so every interview makes you stronger.
              </p>
            </div>

          </div>
        </div>
      </section>
      
      {/* Remove extraneous sections matching the prompt "CREATE THE SAME TO SAME UI PAGES FOR THIS". The screenshot ONLY has the above elements visible on screen. */}
    </div>
  );
};

export default LandingPage;
