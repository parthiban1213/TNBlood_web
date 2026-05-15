import { useState } from 'react';
import { API } from '../lib/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SecurityPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [newPwd,  setNewPwd]  = useState('');
  const [confirm, setConfirm] = useState('');
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [saving,  setSaving]  = useState(false);

  async function doChangePassword() {
    setError(''); setSuccess('');
    if (!newPwd)            { setError('Please enter a new password.'); return; }
    if (newPwd.length < 6)  { setError('Password must be at least 6 characters.'); return; }
    if (newPwd !== confirm)  { setError('Passwords do not match.'); return; }
    setSaving(true);
    const btn = document.getElementById('cp-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Updating…'; }
    try {
      const res  = await fetch(API + '/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ newPassword: newPwd, confirmPassword: confirm }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || 'Password changed successfully!');
        setNewPwd(''); setConfirm('');
        showToast('Password changed!', 'success');
      } else { setError(data.error || 'Failed to change password.'); }
    } catch(e) { setError('Request failed. Please check your connection.'); }
    if (btn) { btn.disabled = false; btn.textContent = '🔒 Update Password'; }
    setSaving(false);
  }

  const inpStyle = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 14px 11px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none',transition:'border-color .17s,box-shadow .17s'};

  return (
    <div id="page-security" className="page">
      <div className="page-header">
        <h2>Security <span>Settings</span></h2>
        <p>Manage your account password and email address</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))',gap:24,maxWidth:860}}>
        <div className="card" style={{padding:28}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
            <div style={{width:42,height:42,borderRadius:12,background:'var(--red-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',flexShrink:0}}>🔒</div>
            <div>
              <div style={{fontFamily:'var(--font-ui)',fontWeight:700,color:'var(--text)',fontSize:'0.95rem'}}>Change Password</div>
              <div style={{fontSize:'0.75rem',color:'var(--text2)',marginTop:2}}>Update your login password</div>
            </div>
          </div>

          {error   && <div className="login-error show"  id="cp-error"   data-testid="cp-error">{error}</div>}
          {success && <div className="login-error show"  id="cp-success" data-testid="cp-success" style={{background:'#EDFBF3',borderColor:'#BBF7D0',color:'#15803D'}}>{success}</div>}

          <div className="form-group" style={{marginBottom:14}}>
            <label style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text2)',marginBottom:5,display:'block'}}>New Password *</label>
            <div className="login-input-wrap">
              <span className="input-icon">🔒</span>
              <input type="password" id="cp-new" placeholder="At least 6 characters"
                style={inpStyle} autoComplete="new-password"
                value={newPwd} onChange={e => setNewPwd(e.target.value)}/>
            </div>
          </div>
          <div className="form-group" style={{marginBottom:20}}>
            <label style={{fontSize:'0.8rem',fontWeight:600,color:'var(--text2)',marginBottom:5,display:'block'}}>Confirm New Password *</label>
            <div className="login-input-wrap">
              <span className="input-icon">🔒</span>
              <input type="password" id="cp-confirm" placeholder="Re-enter new password"
                style={inpStyle} autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doChangePassword()}/>
            </div>
          </div>
          <button className="btn btn-primary" id="cp-btn" onClick={doChangePassword}
            disabled={saving} style={{width:'100%'}} type="button">
            🔒 Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
