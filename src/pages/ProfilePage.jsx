import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { API } from '../lib/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const BT = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

export default function ProfilePage() {
  const { user, isAdmin, token, updateUser, doLogout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({firstName:'',lastName:'',username:'',email:'',bloodType:'',mobile:'',isAvailable:'true',address:'',city:'',lastDonationDate:''});
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [success,setSuccess]= useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [mobilePanel, setMobilePanel] = useState(false);

  const fill = useCallback(u => {
    if (!u) return;
    setF({firstName:u.firstName||'',lastName:u.lastName||'',username:u.username||'',email:u.email||'',bloodType:u.bloodType||'',mobile:u.mobile||'',isAvailable:u.isAvailable!==undefined?String(u.isAvailable):'true',address:u.address||'',city:u.city||'',lastDonationDate:u.lastDonationDate?u.lastDonationDate.split('T')[0]:''});
  }, []);

  useEffect(() => {
    if (user) fill(user);
    apiFetch('/auth/profile').then(res => { if (res.success) { updateUser(res.user); fill(res.user); }});
  }, []);

  const clearMsgs = () => { setError(''); setSuccess(''); };

  async function saveProfile() {
    clearMsgs();
    if (!f.username || f.username.length < 3) { setError('Username must be at least 3 characters.'); return; }
    const btn = document.getElementById('profile-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    setSaving(true);
    const res = await apiFetch('/auth/profile', { method:'PUT', body: JSON.stringify({
      firstName: f.firstName, lastName: f.lastName, username: f.username,
      email: f.email, bloodType: f.bloodType, isAvailable: f.isAvailable === 'true',
      address: f.address, city: f.city, lastDonationDate: f.lastDonationDate || null,
    })});
    if (res.success) { updateUser(res.user); fill(res.user); setSuccess(res.message || 'Profile updated successfully!'); showToast('Profile updated!'); }
    else setError(res.error || 'Update failed.');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; }
    setSaving(false);
  }

  async function deleteAccount() {
    const res = await apiFetch('/auth/account', { method:'DELETE' });
    if (res.success) { showToast('Your account has been deleted.', 'success'); setTimeout(doLogout, 1200); }
    else showToast(res.error || 'Failed to delete account.', 'error');
    setDeleteConfirm(false);
  }

  const initial = ((f.firstName || f.username || '?')[0] || '?').toUpperCase();
  const lastDon   = f.lastDonationDate ? new Date(f.lastDonationDate) : null;
  // Guard against future lastDonationDate (bad data) — treat as today if date is in the future
  const lastDonSafe = lastDon && lastDon.getTime() > Date.now() ? new Date() : lastDon;
  const nextElig = lastDonSafe && !isNaN(lastDonSafe) ? new Date(lastDonSafe.getTime() + 90*86400000) : null;
  const daysLeft = nextElig ? Math.max(0, Math.ceil((nextElig - Date.now()) / 86400000)) : null;
  const isElig   = daysLeft !== null ? daysLeft <= 0 : null;

  return (
    <div id="page-profile" className="page">
      <div className="page-header-row page-header">
        <div><h2>My <span>Profile</span></h2><p>View and update your account information</p></div>
      </div>

      <div className="profile-card">
        {/* Avatar + name header */}
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28,paddingBottom:22,borderBottom:'1px solid var(--border2)'}}>
          <div className="profile-avatar-lg" id="profile-avatar-lg">{initial}</div>
          <div>
            <div id="profile-display-name" style={{fontFamily:'var(--font-display)',fontSize:'1.4rem',fontWeight:700,color:'var(--text)'}}>{f.username || '—'}</div>
            <div id="profile-display-role"  style={{fontSize:'0.8rem',color:'var(--text2)',marginTop:3,fontFamily:'var(--font-ui)'}}>{isAdmin ? '🛡️ Administrator' : '👤 TN user'}</div>
            <div id="profile-display-bloodtype" style={{marginTop:6}}>
              {f.bloodType ? <span className="blood-badge">{f.bloodType}</span> : <span style={{fontSize:'0.75rem',color:'var(--text3)',fontFamily:'var(--font-ui)'}}>No blood type set</span>}
            </div>
            {user?.donorId && <div id="profile-donor-badge" style={{marginTop:6}}><span style={{background:'var(--red-light)',border:'1px solid rgba(200,16,46,0.2)',color:'var(--red)',padding:'4px 12px',borderRadius:20,fontSize:'0.75rem',fontFamily:'var(--font-ui)',fontWeight:600}}>🩸 Registered Donor</span></div>}
          </div>
        </div>

        {/* Msgs */}
        {error   && <div id="profile-error"   style={{display:'block',background:'#FEF2F2',border:'1.5px solid #FECACA',borderRadius:10,padding:'11px 14px',fontSize:'0.82rem',color:'#DC2626',fontFamily:'var(--font-ui)',marginBottom:14}}>⚠️ {error}</div>}
        {success && <div id="profile-success" style={{display:'block',background:'#EDFBF4',border:'1.5px solid #BBF7D0',borderRadius:10,padding:'11px 14px',fontSize:'0.82rem',color:'#15803D',fontFamily:'var(--font-ui)',marginBottom:14}}>✅ {success}</div>}

        {/* Account Details */}
        <div style={{fontFamily:'var(--font-ui)',fontSize:'0.72rem',fontWeight:700,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12,paddingBottom:6,borderBottom:'1px solid var(--border2)'}}>Account Details</div>
        <div className="profile-field-row">
          <div className="form-group"><label>First Name</label><input type="text" id="profile-firstName" data-testid="profile-firstName" placeholder="Your first name" style={IS} value={f.firstName} onChange={e=>setF(p=>({...p,firstName:e.target.value}))}/></div>
          <div className="form-group"><label>Last Name</label><input type="text" id="profile-lastName" data-testid="profile-lastName" placeholder="Your last name" style={IS} value={f.lastName} onChange={e=>setF(p=>({...p,lastName:e.target.value}))}/></div>
        </div>
        <div className="profile-field-row">
          <div className="form-group"><label>Username</label><input type="text" id="profile-username" data-testid="profile-username" placeholder="Your username" style={IS} value={f.username} onChange={e=>setF(p=>({...p,username:e.target.value}))}/></div>
          <div className="form-group"><label>Email Address</label><input type="email" id="profile-email" data-testid="profile-email" placeholder="you@example.com" style={IS} value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))}/></div>
        </div>

        {/* Donor Information */}
        <div style={{fontFamily:'var(--font-ui)',fontSize:'0.72rem',fontWeight:700,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',margin:'18px 0 12px',paddingBottom:6,borderBottom:'1px solid var(--border2)'}}>🩸 Donor Information</div>

        <div className="profile-field-row">
          {/* Mobile with OTP panel */}
          <div className="form-group">
            <label>Mobile Number <span style={{fontSize:'0.7rem',color:'var(--text3)',fontWeight:400}}>(used for OTP login)</span></label>
            <div id="profile-mobile-display-row" style={{display:'flex',alignItems:'center',gap:8}}>
              <div className="login-input-wrap" style={{flex:1}}>
                <span className="input-icon">📱</span>
                <input type="tel" id="profile-mobile" data-testid="profile-mobile" placeholder="Not set" readOnly value={f.mobile} style={{...IS,padding:'10px 14px 10px 40px',opacity:0.75,cursor:'default'}}/>
              </div>
              <button onClick={()=>setMobilePanel(p=>!p)} id="profile-mobile-change-btn"
                style={{padding:'10px 12px',background:'none',border:'1.5px solid var(--border)',borderRadius:10,color:'var(--text2)',fontFamily:'var(--font-ui)',fontSize:'0.78rem',cursor:'pointer',whiteSpace:'nowrap',fontWeight:600}}>
                ✏️ Change
              </button>
            </div>
            {mobilePanel && <MobileOTPPanel currentMobile={f.mobile} token={token} onUpdated={m=>{updateUser({mobile:m});setF(p=>({...p,mobile:m}));setMobilePanel(false);}}/>}
          </div>

          <div className="form-group">
            <label>Blood Type <span style={{color:'var(--text3)',fontWeight:400}}>(for notifications)</span></label>
            <select id="profile-bloodtype" data-testid="profile-bloodtype" style={{...IS,cursor:'pointer'}} value={f.bloodType} onChange={e=>setF(p=>({...p,bloodType:e.target.value}))}>
              <option value="">— Not specified —</option>
              {BT.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div className="profile-field-row">
          <div className="form-group">
            <label>Availability Status</label>
            <select id="profile-available" data-testid="profile-available" style={{...IS,cursor:'pointer'}} value={f.isAvailable} onChange={e=>setF(p=>({...p,isAvailable:e.target.value}))}>
              <option value="true">✅ Available to Donate</option>
              <option value="false">❌ Not Available</option>
            </select>
          </div>
          <div className="form-group">
            <label>Last Donation Date</label>
            <input type="date" id="profile-lastDonation" data-testid="profile-lastDonation" style={IS} value={f.lastDonationDate} onChange={e=>setF(p=>({...p,lastDonationDate:e.target.value}))}/>
          </div>
        </div>

        {/* Eligibility info */}
        {nextElig && (
          <div id="profile-eligibility-info" style={{display:'',marginBottom:14}}>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:12}}>
              <div style={{flex:1,minWidth:180,background:isElig?'#F0FDF4':'#FEF3C7',border:`1.5px solid ${isElig?'#BBF7D0':'#FCD34D'}`,borderRadius:10,padding:'12px 14px'}}>
                <div style={{fontSize:'0.7rem',fontWeight:700,color:isElig?'#15803D':'#92400E',textTransform:'uppercase',letterSpacing:'0.06em',fontFamily:'var(--font-ui)',marginBottom:4}}>📅 Next Eligible Date</div>
                <div style={{fontSize:'0.95rem',fontWeight:700,color:'var(--text)',fontFamily:'var(--font-ui)'}}>{nextElig.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
              </div>
              <div style={{flex:1,minWidth:180,background:isElig?'#F0FDF4':'#FEF3C7',border:`1.5px solid ${isElig?'#BBF7D0':'#FCD34D'}`,borderRadius:10,padding:'12px 14px'}}>
                <div style={{fontSize:'0.7rem',fontWeight:700,color:isElig?'#15803D':'#92400E',textTransform:'uppercase',letterSpacing:'0.06em',fontFamily:'var(--font-ui)',marginBottom:4}}>⏳ Days Until Next Donation</div>
                <div style={{fontSize:'0.95rem',fontWeight:700,color:'var(--text)',fontFamily:'var(--font-ui)'}}>{isElig ? '✅ Eligible Now' : `${daysLeft} day${daysLeft!==1?'s':''} remaining`}</div>
              </div>
            </div>
          </div>
        )}

        <div className="form-group" style={{marginBottom:14}}>
          <label>Address</label>
          <input type="text" id="profile-address" data-testid="profile-address" placeholder="Your address" style={IS} value={f.address} onChange={e=>setF(p=>({...p,address:e.target.value}))}/>
        </div>
        <div className="form-group" style={{marginBottom:14}}>
          <label>City</label>
          <input type="text" id="profile-city" data-testid="profile-city" placeholder="Your city" style={IS} value={f.city} onChange={e=>setF(p=>({...p,city:e.target.value}))}/>
        </div>

        <div style={{display:'flex',gap:10,alignItems:'center',paddingTop:6}}>
          <button id="profile-save-btn" data-testid="profile-save-btn" className="btn btn-primary" onClick={saveProfile} type="button">💾 Save Changes</button>
          <button className="btn btn-outline" onClick={()=>{clearMsgs();fill(user);}} type="button">↺ Reset</button>
          <a href="#" onClick={e=>{e.preventDefault();navigate('/security');}} style={{marginLeft:'auto',fontSize:'0.78rem',color:'var(--text3)',fontFamily:'var(--font-ui)',textDecoration:'none'}}>🔐 Change Password →</a>
        </div>

        {/* Delete Zone */}
        {!isAdmin && (
          <div id="profile-delete-zone" style={{marginTop:28,paddingTop:20,borderTop:'1px solid var(--border2)'}}>
            <div style={{fontFamily:'var(--font-ui)',fontSize:'0.72rem',fontWeight:700,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:12}}>⚠️ Danger Zone</div>
            <div style={{background:'#FEF2F2',border:'1.5px solid #FECACA',borderRadius:12,padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
              <div>
                <div style={{fontFamily:'var(--font-ui)',fontWeight:700,fontSize:'0.88rem',color:'#DC2626',marginBottom:3}}>Delete My Account</div>
                <div style={{fontSize:'0.78rem',color:'var(--text2)',fontFamily:'var(--font-ui)',lineHeight:1.5}}>Permanently deletes your account and removes you from the donor list. This cannot be undone.</div>
              </div>
              <button onClick={()=>setDeleteConfirm(true)} style={{padding:'9px 18px',background:'#DC2626',color:'#fff',border:'none',borderRadius:10,fontFamily:'var(--font-ui)',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}} type="button">🗑 Delete Account</button>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && <ConfirmModal title="Delete My Account" body="Are you sure? This will permanently delete your account AND remove you from the donor list. This cannot be undone." confirmLabel="Delete Account" danger onConfirm={deleteAccount} onCancel={()=>setDeleteConfirm(false)}/>}
    </div>
  );
}

function MobileOTPPanel({ currentMobile, token, onUpdated }) {
  const { showToast } = useToast();
  const [newMobile, setNewMobile] = useState('');
  const [otp,       setOtp]       = useState('');
  const [otpSent,   setOtpSent]   = useState(false);
  const [error,     setError]     = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (countdown <= 0) return;
    timerRef.current = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; }), 1000);
    return () => clearInterval(timerRef.current);
  }, [countdown]);

  async function send() {
    setError('');
    if (!/^[6-9]\d{9}$/.test(newMobile.trim())) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (currentMobile === newMobile.trim()) { setError('This is already your current mobile number.'); return; }
    const btn = document.getElementById('profile-mobile-send-otp-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const res  = await fetch(API + '/auth/otp/send', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ mobile: newMobile.trim() }) });
      const data = await res.json();
      if (data.success) {
        if (data.isExistingUser) { setError('This mobile is already registered to another account.'); if (btn) { btn.disabled = false; btn.textContent = '📲 Send OTP'; } return; }
        setOtpSent(true); setCountdown(60); showToast('OTP sent to +91 ' + newMobile.trim(), 'success');
      } else { setError(data.error || 'Failed to send OTP.'); }
    } catch(e) { setError('Cannot connect to server.'); }
    if (btn) { btn.disabled = false; btn.textContent = '📲 Send OTP'; }
  }

  async function verify() {
    setError('');
    if (!/^\d{6}$/.test(otp.trim())) { setError('Please enter the 6-digit OTP.'); return; }
    const btn = document.getElementById('profile-mobile-verify-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying…'; }
    try {
      const res  = await fetch(API + '/auth/mobile/update', { method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}, body: JSON.stringify({ newMobile: newMobile.trim(), otp: otp.trim() }) });
      const data = await res.json();
      if (data.success) { clearInterval(timerRef.current); showToast('Mobile number updated! 📱', 'success'); onUpdated(newMobile.trim()); }
      else { setError(data.error || 'Verification failed.'); if (btn) { btn.disabled = false; btn.textContent = '✅ Verify & Update'; } }
    } catch(e) { setError('Cannot connect to server.'); if (btn) { btn.disabled = false; btn.textContent = '✅ Verify & Update'; } }
  }

  const iStyle = {width:'100%',background:'#fff',border:'1.5px solid var(--border)',borderRadius:10,color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.85rem',outline:'none'};

  return (
    <div id="profile-mobile-otp-panel" style={{display:'',marginTop:10,background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:12,padding:14}}>
      <p style={{fontSize:'0.75rem',color:'var(--text2)',fontFamily:'var(--font-ui)',marginBottom:10}}>Enter new mobile number and verify with OTP.</p>
      {error && <div id="profile-mobile-otp-error" style={{fontSize:'0.78rem',color:'#DC2626',fontFamily:'var(--font-ui)',marginBottom:6}}>{error}</div>}
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <div className="login-input-wrap" style={{flex:1}}>
          <span className="input-icon">📱</span>
          <input type="tel" id="profile-mobile-new" placeholder="New 10-digit mobile" maxLength={10}
            style={{...iStyle,padding:'9px 12px 9px 38px'}} value={newMobile} onChange={e=>setNewMobile(e.target.value)} disabled={otpSent}/>
        </div>
        <button id="profile-mobile-send-otp-btn" onClick={send} type="button"
          disabled={otpSent && countdown > 0}
          style={{padding:'9px 13px',background:'var(--red)',color:'#fff',border:'none',borderRadius:10,fontFamily:'var(--font-ui)',fontSize:'0.78rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
          {otpSent && countdown > 0 ? `${countdown}s` : '📲 Send OTP'}
        </button>
      </div>
      {otpSent && (
        <div id="profile-mobile-otp-row" style={{marginBottom:8}}>
          <div className="login-input-wrap">
            <span className="input-icon">🔐</span>
            <input type="text" id="profile-mobile-otp" placeholder="6-digit OTP" maxLength={6}
              style={{...iStyle,padding:'9px 12px 9px 38px',letterSpacing:'0.25em'}} value={otp} onChange={e=>setOtp(e.target.value)} autoFocus/>
          </div>
          {countdown > 0 && <div><span id="profile-mobile-otp-timer" style={{fontSize:'0.72rem',color:'var(--text3)',fontFamily:'var(--font-ui)'}}>Resend in {countdown}s</span></div>}
        </div>
      )}
      <div style={{display:'flex',gap:8}}>
        {otpSent && <button id="profile-mobile-verify-btn" onClick={verify} type="button" style={{flex:1,padding:9,background:'var(--red)',color:'#fff',border:'none',borderRadius:10,fontFamily:'var(--font-ui)',fontSize:'0.82rem',fontWeight:600,cursor:'pointer'}}>✅ Verify & Update</button>}
        <button onClick={()=>{clearInterval(timerRef.current);setOtpSent(false);setOtp('');setError('');}} type="button" style={{padding:'9px 13px',background:'none',border:'1.5px solid var(--border)',borderRadius:10,color:'var(--text2)',fontFamily:'var(--font-ui)',fontSize:'0.82rem',cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  );
}
