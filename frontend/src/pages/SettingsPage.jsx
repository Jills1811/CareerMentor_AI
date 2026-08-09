import React, { useMemo, useState, useEffect } from 'react';
import './SettingsPage.css';

const SettingsPage = () => {
  const [profile, setProfile] = useState({ id: '', name: '', email: '' });
  const [passwords, setPasswords] = useState({ old: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('careermentor_theme') || 'dark');
  const [openFaq, setOpenFaq] = useState(0);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('careermentor_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setProfile({ id: u.id || '', name: u.name || '', email: u.email || '' });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('careermentor_theme', t);
  }, [theme]);

  const faqItems = useMemo(() => ([
    {
      q: 'How do I switch between light and dark mode?',
      a: 'Open Settings → Appearance and use the theme toggle. Your preference is saved automatically for next time.'
    },
    {
      q: 'How do I change my password?',
      a: 'Go to Settings → Security, enter your current password and a new one, then click “Update Password & Profile”.'
    },
    {
      q: 'What happens if I delete my account?',
      a: 'Account deletion is permanent. Your profile and saved activity are removed and you will be logged out. (UI only right now.)'
    },
    {
      q: 'Why can’t I edit my email?',
      a: 'Email is used as a unique identifier for sign-in. If you need to change it, contact support in a future update.'
    }
  ]), []);

  const handleUpdate = async () => {
    if (passwords.new && passwords.new !== passwords.confirm) {
      setMessageType('error');
      setMessage("New passwords do not match!");
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageType('success');

    try {
      const res = await fetch('http://localhost:8000/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          name: profile.name,
          old_password: passwords.old,
          new_password: passwords.new
        })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setMessageType('success');
        setMessage(data.message || "Profile updated successfully!");
        const storedUser = JSON.parse(localStorage.getItem('careermentor_user') || '{}');
        storedUser.name = profile.name;
        localStorage.setItem('careermentor_user', JSON.stringify(storedUser));
        
        setPasswords({ old: '', new: '', confirm: '' });
      } else {
        setMessageType('error');
        setMessage(data.detail || data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setMessageType('error');
      setMessage("An error occurred during update.");
    } finally {
      setLoading(false);
    }
  };

  const canDelete = deleteAcknowledge && deleteConfirmText.trim().toUpperCase() === 'DELETE';

  const handleDeleteAccount = () => {
    // UI-only: keep it safe and non-destructive.
    setDeleteModalOpen(false);
    setDeleteConfirmText('');
    setDeleteAcknowledge(false);
    setMessageType('error');
    setMessage('Delete account is UI-only right now (no backend action performed).');
  };

  const FaqItem = ({ index, title, children }) => {
    const isOpen = openFaq === index;
    return (
      <button
        type="button"
        className={`faq-item ${isOpen ? 'open' : ''}`}
        onClick={() => setOpenFaq(isOpen ? -1 : index)}
        aria-expanded={isOpen}
      >
        <div className="faq-item__top">
          <span className="faq-item__q">{title}</span>
          <span className="faq-item__chev" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </span>
        </div>
        <div className="faq-item__a" role="region">
          {children}
        </div>
      </button>
    );
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon icon-purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Personalize your experience, secure your account, and find quick help.</p>
          </div>
        </div>
      </div>

      <div className="settings-content">
        {/* Appearance */}
        <div className="settings-card card">
          <div className="settings-card__head">
            <div>
              <h3 className="settings-card__title">Appearance</h3>
              <p className="settings-card__subtitle">Pick a theme that matches your vibe.</p>
            </div>
            <span className="badge badge-primary">New</span>
          </div>

          <div className="settings-row">
            <div className="settings-row__left">
              <div className="settings-row__label">Theme</div>
              <div className="settings-row__hint">Switch between dark and light mode.</div>
            </div>

            <div className="settings-row__right">
              <div className="theme-pill" role="group" aria-label="Theme">
                <button
                  type="button"
                  className={`theme-pill__btn ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  Dark
                </button>
                <button
                  type="button"
                  className={`theme-pill__btn ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  Light
                </button>
              </div>
            </div>
          </div>

          <div className="settings-preview">
            <div className="settings-preview__card">
              <div className="settings-preview__top">
                <div className="settings-preview__dot dot-1"></div>
                <div className="settings-preview__dot dot-2"></div>
                <div className="settings-preview__dot dot-3"></div>
              </div>
              <div className="settings-preview__content">
                <div className="settings-preview__title">Preview</div>
                <div className="settings-preview__line"></div>
                <div className="settings-preview__line short"></div>
              </div>
            </div>
            <div className="settings-preview__glow" aria-hidden="true"></div>
          </div>
        </div>

        {/* Profile Card */}
        <div className="settings-card card">
          <div className="settings-card__head">
            <div>
              <h3 className="settings-card__title">Profile</h3>
              <p className="settings-card__subtitle">Update your name and view account email.</p>
            </div>
            <span className="settings-chip">Account</span>
          </div>
          
          <div className="settings-form">
            <div className="input-group">
              <label className="input-label" htmlFor="profile-name">Name</label>
              <input 
                type="text" 
                id="profile-name" 
                className="input-field" 
                value={profile.name} 
                onChange={e => setProfile({...profile, name: e.target.value})}
              />
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="profile-email">Email</label>
              <input 
                type="email" 
                id="profile-email" 
                className="input-field" 
                value={profile.email} 
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="settings-card card">
          <div className="settings-card__head">
            <div>
              <h3 className="settings-card__title">Security</h3>
              <p className="settings-card__subtitle">Keep your account protected with a strong password.</p>
            </div>
            <span className="settings-chip settings-chip--secure">Protected</span>
          </div>
          
          <div className="settings-form">
            <div className="input-group">
              <label className="input-label" htmlFor="old-password">Old Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showOldPass ? "text" : "password"} 
                  id="old-password" 
                  className="input-field" 
                  placeholder="Enter old password"
                  value={passwords.old}
                  onChange={e => setPasswords({...passwords, old: e.target.value})}
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowOldPass(!showOldPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex' }}>
                  {showOldPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="input-group">
              <label className="input-label" htmlFor="new-password">New Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showNewPass ? "text" : "password"} 
                  id="new-password" 
                  className="input-field" 
                  placeholder="Enter new password"
                  value={passwords.new}
                  onChange={e => setPasswords({...passwords, new: e.target.value})}
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex' }}>
                  {showNewPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirm-password">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirmPass ? "text" : "password"} 
                  id="confirm-password" 
                  className="input-field" 
                  placeholder="Enter confirm password"
                  value={passwords.confirm}
                  onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                  style={{ paddingRight: '40px' }}
                />
                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex' }}>
                  {showConfirmPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              {message && (
                <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '1rem' }}>
                  <span>{message}</span>
                </div>
              )}
              <button 
                className="btn btn-primary" 
                style={{ background: '#5a67d8', color: 'white' }}
                onClick={handleUpdate}
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Password & Profile'}
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-card card settings-card--danger">
          <div className="settings-card__head">
            <div>
              <h3 className="settings-card__title">Danger zone</h3>
              <p className="settings-card__subtitle">Delete your account and erase your data. This can’t be undone.</p>
            </div>
            <span className="settings-chip settings-chip--danger">Permanent</span>
          </div>

          <div className="danger-row">
            <div className="danger-row__left">
              <div className="danger-row__title">Delete account</div>
              <div className="danger-row__hint">You’ll lose access immediately. This is UI-only for now.</div>
            </div>
            <div className="danger-row__right">
              <button type="button" className="btn btn-danger" onClick={() => setDeleteModalOpen(true)}>
                Delete account
              </button>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="settings-card card">
          <div className="settings-card__head">
            <div>
              <h3 className="settings-card__title">FAQs</h3>
              <p className="settings-card__subtitle">Quick answers to common questions.</p>
            </div>
            <span className="settings-chip">Help</span>
          </div>

          <div className="faq-list">
            {faqItems.map((item, idx) => (
              <FaqItem key={item.q} index={idx} title={item.q}>
                <div className="faq-item__inner">{item.a}</div>
              </FaqItem>
            ))}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete account confirmation">
          <div className="modal">
            <div className="modal__top">
              <div className="modal__icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M8 6V4h8v2"></path>
                  <path d="M19 6l-1 14H6L5 6"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                </svg>
              </div>
              <div>
                <div className="modal__title">Delete your account?</div>
                <div className="modal__subtitle">This is permanent. Type <b>DELETE</b> to confirm.</div>
              </div>
            </div>

            <div className="modal__content">
              <div className="input-group">
                <label className="input-label" htmlFor="delete-confirm">Confirmation</label>
                <input
                  id="delete-confirm"
                  className="input-field"
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>

              <label className="danger-check">
                <input
                  type="checkbox"
                  checked={deleteAcknowledge}
                  onChange={(e) => setDeleteAcknowledge(e.target.checked)}
                />
                <span>I understand this action cannot be undone.</span>
              </label>
            </div>

            <div className="modal__actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText('');
                  setDeleteAcknowledge(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={!canDelete}
              >
                Permanently delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
