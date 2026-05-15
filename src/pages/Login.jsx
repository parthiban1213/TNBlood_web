import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../lib/config.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const BT = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};
const IS_PAD = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 14px 11px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.9rem',outline:'none',transition:'border-color .17s'};

export default function Login() {
  const { persistAndLogin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState('user'); // user | admin
  const [showSupport, setShowSupport] = useState(false);

  // Blood drop animation — runs once on first mouseenter of left panel
  useEffect(() => {
    let hasPlayed = false;
    let animTimer = null;

    function spawnSplatters(splashX, splashY, splatterC) {
      if (!splatterC) return;
      splatterC.innerHTML = '';
      [0,35,75,120,155,200,245,300,335].forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const d   = 14 + Math.random() * 18;
        const dot = document.createElement('div');
        dot.className = 'blood-splatter';
        dot.style.cssText = `left:${splashX}px;top:${splashY}px;--sx:${Math.round(Math.cos(rad)*d)}px;--sy:${Math.round(Math.sin(rad)*d)}px;width:${2+Math.random()*3}px;height:${2+Math.random()*3}px;`;
        splatterC.appendChild(dot);
        void dot.offsetWidth;
        dot.classList.add('flying');
        setTimeout(() => dot.remove(), 420);
      });
    }

    function runDrop() {
      if (hasPlayed) return;
      hasPlayed = true;
      const loginLeft = document.querySelector('.login-left');
      const scene     = document.getElementById('drop-scene');
      const icon      = document.getElementById('drop-icon');
      const drop      = document.getElementById('blood-drop');
      const bloodText = document.getElementById('blood-text');
      const splatterC = document.getElementById('splatter-container');
      if (!loginLeft || !scene || !icon || !drop || !bloodText) return;
      loginLeft.removeEventListener('mouseenter', runDrop);

      const sceneR = scene.getBoundingClientRect();
      const iconR  = icon.getBoundingClientRect();
      const textR  = bloodText.getBoundingClientRect();
      const startX = iconR.left + iconR.width/2 - sceneR.left;
      const startY = iconR.top + iconR.height - sceneR.top;
      const dist   = (textR.top - sceneR.top + 4) - startY;
      const splashX = textR.left + textR.width/2 - sceneR.left;
      const splashY = textR.top + textR.height/2 - sceneR.top;

      drop.style.left = startX + 'px'; drop.style.top = startY + 'px';
      drop.style.marginLeft = '0'; drop.style.transform = 'translateX(-50%)';
      drop.style.setProperty('--drop-distance', dist + 'px');
      drop.classList.remove('falling');
      bloodText.style.setProperty('--fill-left', '50%');
      bloodText.style.setProperty('--fill-right', '50%');
      if (splatterC) splatterC.innerHTML = '';
      void drop.offsetWidth;
      drop.classList.add('falling');

      animTimer = setTimeout(() => {
        spawnSplatters(splashX, splashY, splatterC);
        // Animate fill
        const start = performance.now();
        function step(now) {
          const t = Math.min((now - start) / 800, 1);
          const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
          const pct = ease * 100;
          bloodText.style.setProperty('--fill-left',  (50 - pct*0.5).toFixed(2) + '%');
          bloodText.style.setProperty('--fill-right', (50 + pct*0.5).toFixed(2) + '%');
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, 490);
    }

    const loginLeft = document.querySelector('.login-left');
    if (loginLeft) loginLeft.addEventListener('mouseenter', runDrop);
    return () => {
      clearTimeout(animTimer);
      const el = document.querySelector('.login-left');
      if (el) el.removeEventListener('mouseenter', runDrop);
    };
  }, []);

  // shared error for login-error div
  const [loginErr, setLoginErr] = useState('');

  function switchTab(t) { setTab(t); setLoginErr(''); }

  return (
    <div id="login-screen" data-testid="login-screen">

      {/* LEFT PANEL */}
      <div className="login-left">
        <div className="login-left-content" id="drop-scene">
          <div className="blood-drop-anim" id="blood-drop">
            <svg viewBox="0 0 20 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0 C10 0 0 12 0 17 A10 10 0 0 0 20 17 C20 12 10 0 10 0Z" fill="#C8102E"/>
              <ellipse cx="7" cy="13" rx="2.5" ry="3.5" fill="rgba(255,255,255,0.28)" transform="rotate(-25 7 13)"/>
              <circle cx="13" cy="10" r="1.2" fill="rgba(255,255,255,0.18)"/>
            </svg>
          </div>
          <div id="splatter-container"/>
          <div className="login-left-icon" id="drop-icon">🩸</div>
          <h1><span className="hs-text">TN</span><span className="blood-text" id="blood-text">Blood</span></h1>
          <p>Donor Registry System</p>
          <div className="login-left-cards">
            <div className="login-info-card">
              <div className="lic-title">🛡️ Be a Real Hero</div>
              <p>Heroes don't always wear capes. Sometimes they just roll up their sleeves and donate blood..</p>
            </div>
            <div className="login-info-card">
              <div className="lic-title">🛡️ Drop by Drop</div>
              <p>Every drop counts. Your donation can make the difference between life and death.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="login-right">
        <div id="login-form-wrap" className="login-form-wrap">
          <h2>Welcome back</h2>
          <p>Sign in to access the donor registry</p>

          <div className="login-tabs">
            <button id="login-tab-user"  className={`login-tab${tab==='user'?' active':''}`} onClick={()=>switchTab('user')}  type="button">👤 TN User</button>
            <button id="login-tab-admin" className={`login-tab${tab==='admin'?' active':''}`} onClick={()=>switchTab('admin')} type="button">🔑 Admin</button>
          </div>

          <div className="login-role-badge" id="login-role-desc">
            {tab==='admin'
              ? <><div className="role-icon">🛡️</div><p><strong>The Gatekeeper</strong>Access granted with responsibility.</p></>
              : <><div className="role-icon">👁️</div><p><strong>Smart Access</strong>Access what you need to get things done</p></>}
          </div>

          <div className="login-error" id="login-error" data-testid="login-error" style={loginErr?{display:'block'}:{display:'none'}}>{loginErr}</div>

          {tab === 'admin' && <AdminForm setLoginErr={setLoginErr} persistAndLogin={persistAndLogin} showToast={showToast} navigate={navigate}/>}
          {tab === 'user'  && <UserOTPForm setLoginErr={setLoginErr} persistAndLogin={persistAndLogin} showToast={showToast} navigate={navigate}/>}

          {/* Contact Support */}
          <div style={{textAlign:'center',marginTop:20,paddingTop:16,borderTop:'1px solid var(--border2)'}}>
            <button onClick={()=>setShowSupport(true)} style={{background:'none',border:'none',color:'var(--text3)',fontFamily:'var(--font-ui)',fontSize:'0.78rem',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5}} type="button">
              💬 Contact Support
            </button>
          </div>
        </div>
      </div>
      {showSupport && <ContactSupportModal onClose={()=>setShowSupport(false)}/>}
    </div>
  );
}

/* ── Admin login ─────────────────────────────────────────── */
function AdminForm({ setLoginErr, persistAndLogin, showToast, navigate }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [loading, setLoading] = useState(false);
  async function doLogin() {
    setLoginErr('');
    if (!u.trim()||!p) { setLoginErr('Please enter both username and password.'); return; }
    setLoading(true);
    try {
      const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u.trim(),password:p})});
      const d=await r.json();
      if(d.success){ if(d.user.role!=='admin'){setLoginErr('Please use the TN User tab for non-admin accounts.');setLoading(false);return;} persistAndLogin(d.token,d.user); showToast('Welcome back, '+d.user.username+' 🛡️','success'); navigate('/dashboard',{replace:true}); }
      else setLoginErr(d.error||'Login failed.');
    } catch(e){setLoginErr('Cannot connect to server.');}
    setLoading(false);
  }
  return (
    <div id="admin-login-form">
      <div className="login-form-group"><label>Username</label>
        <div className="login-input-wrap"><span className="input-icon">👤</span>
          <input type="text" id="login-username" placeholder="Enter your username" autoComplete="username" value={u} onChange={e=>setU(e.target.value)}/></div></div>
      <div className="login-form-group"><label>Password</label>
        <div className="login-input-wrap"><span className="input-icon">🔒</span>
          <input type="password" id="login-password" placeholder="Enter your password" autoComplete="current-password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doLogin()}/></div></div>
      <button className="login-btn" id="login-btn" onClick={doLogin} disabled={loading} type="button">{loading?'Signing in…':'Sign In →'}</button>
    </div>
  );
}

/* ── TN User OTP form ────────────────────────────────────── */
function UserOTPForm({ setLoginErr, persistAndLogin, showToast, navigate }) {
  const [view, setView] = useState('otp-login'); // otp-login | pwd-login | step-otp | step-register
  const [showAvail, setShowAvail] = useState(false);

  // OTP login state
  const [mobile, setMobile]     = useState('');
  const [otpCode, setOtpCode]   = useState('');
  const [otpErr, setOtpErr]     = useState('');
  const [cd, setCd]             = useState(0);
  const [sending, setSending]   = useState(false);
  const [verifying, setVerifying] = useState(false);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(cd<=0)return;
    timerRef.current=setInterval(()=>setCd(c=>{if(c<=1){clearInterval(timerRef.current);return 0;}return c-1;}),1000);
    return()=>clearInterval(timerRef.current);
  },[cd]);

  async function sendOTP(){
    setOtpErr(''); setLoginErr('');
    if(!/^[6-9]\d{9}$/.test(mobile.trim())){setOtpErr('Please enter a valid 10-digit Indian mobile number.');return;}
    setSending(true);
    try{const r=await fetch(API+'/auth/otp/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mobile:mobile.trim()})});const d=await r.json();
      if(d.success){if(!d.isExistingUser&&!d.isExistingDonor){setOtpErr('No account found for this mobile number. Please register first.');setSending(false);return;}setView('step-otp');setCd(60);setOtpCode('');}else setOtpErr(d.error||'Failed to send OTP.');}catch(e){setOtpErr('Cannot connect to server.');}
    setSending(false);
  }

  async function verifyOTP(){
    setOtpErr('');
    if(!/^\d{6}$/.test(otpCode.trim())){setOtpErr('Please enter the 6-digit OTP.');return;}
    setVerifying(true);
    try{const r=await fetch(API+'/auth/otp/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mobile:mobile.trim(),otp:otpCode.trim()})});const d=await r.json();
      if(d.success){clearInterval(timerRef.current);persistAndLogin(d.token,d.user);showToast('Welcome back! 🩸','success');setShowAvail(true);}else setOtpErr(d.error||'Login failed.');}catch(e){setOtpErr('Cannot connect to server.');}
    setVerifying(false);
  }

  function changeOTPMobile(){clearInterval(timerRef.current);setView('otp-login');setOtpCode('');setOtpErr('');}

  return (
    <div id="user-otp-form">
      <div className="login-error" id="otp-error" data-testid="otp-error" style={otpErr?{display:'block'}:{display:'none'}}>{otpErr}</div>

      {/* STEP MOBILE */}
      {(view==='otp-login'||view==='pwd-login') && (
        <div id="step-mobile">
          {/* OTP login section */}
          {view==='otp-login' && <div id="otp-login-section">
            <div className="login-form-group">
              <label>Mobile Number</label>
              <div className="login-input-wrap"><span className="input-icon">📱</span>
                <input type="tel" id="otp-mobile" placeholder="10-digit mobile number" maxLength={10} autoComplete="tel"
                  onKeyDown={e=>e.key==='Enter'&&sendOTP()} value={mobile} onChange={e=>setMobile(e.target.value)}
                  style={{width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 14px 11px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.9rem',outline:'none',transition:'border-color .17s'}}/>
              </div>
              <p style={{fontSize:'0.72rem',color:'var(--text3)',marginTop:5,fontFamily:'var(--font-ui)'}}>Already registered? Enter your mobile number and sign in with OTP.</p>
            </div>
            <button className="login-btn" id="otp-send-btn" onClick={sendOTP} disabled={sending} type="button">{sending?'Sending…':'📲 Sign In with OTP'}</button>
            <div className="signup-divider" style={{margin:'14px 0 12px'}}><hr/><span>or</span><hr/></div>
            <button id="user-pwd-toggle-btn" onClick={()=>setView('pwd-login')} type="button"
              style={{width:'100%',padding:10,background:'none',border:'1.5px solid var(--border)',borderRadius:10,color:'var(--text2)',fontFamily:'var(--font-ui)',fontSize:'0.85rem',cursor:'pointer'}}>
              🔑 Sign In with Username &amp; Password
            </button>
            <div className="signup-divider" style={{margin:'18px 0 14px'}}><hr/><span>New here?</span><hr/></div>
            <button className="signup-btn" id="open-register-btn" onClick={()=>setView('step-register')} type="button">✨ Register as TN User</button>
          </div>}

          {/* Username/Password section */}
          {view==='pwd-login' && <PwdLogin setLoginErr={setLoginErr} persistAndLogin={persistAndLogin} showToast={showToast} navigate={navigate} onBack={()=>setView('otp-login')}/>}
        </div>
      )}

      {/* STEP OTP */}
      {view==='step-otp' && (
        <div id="step-otp">
          <div style={{textAlign:'center',marginBottom:16,padding:14,background:'var(--red-light)',borderRadius:12,border:'1px solid rgba(200,16,46,0.12)'}}>
            <p style={{fontSize:'0.8rem',color:'var(--text2)',fontFamily:'var(--font-ui)'}}>OTP sent to</p>
            <p id="otp-mobile-display" style={{fontSize:'1.1rem',fontWeight:700,color:'var(--text)',fontFamily:'var(--font-display)'}}>+91 {mobile}</p>
            <button onClick={changeOTPMobile} type="button" style={{fontSize:'0.72rem',color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-ui)',marginTop:2}}>✏️ Change number</button>
          </div>
          <div className="login-form-group"><label>Enter OTP</label>
            <div className="login-input-wrap"><span className="input-icon">🔐</span>
              <input type="text" id="otp-code" placeholder="6-digit OTP" maxLength={6} autoComplete="one-time-code"
                onKeyDown={e=>e.key==='Enter'&&verifyOTP()} value={otpCode} onChange={e=>setOtpCode(e.target.value)} autoFocus
                style={{width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 14px 11px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'1.1rem',letterSpacing:'0.25em',outline:'none',transition:'border-color .17s'}}/>
            </div>
          </div>
          <button className="login-btn" id="otp-verify-btn" onClick={verifyOTP} disabled={verifying} type="button">{verifying?'Verifying…':'✅ Verify OTP'}</button>
          <div style={{textAlign:'center',marginTop:10}}>
            <span id="otp-resend-timer" style={{fontSize:'0.78rem',color:'var(--text3)',fontFamily:'var(--font-ui)'}}>{cd>0?`Resend in ${cd}s`:''}</span>
            {cd<=0 && <button id="otp-resend-btn" onClick={()=>{ setView('otp-login'); setOtpCode(''); setOtpErr(''); /* mobile kept — matches original resendOTP() pre-filling otpMobile */ }} type="button" style={{fontSize:'0.78rem',color:'var(--red)',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-ui)'}}>🔄 Resend OTP</button>}
          </div>
        </div>
      )}

      {/* STEP REGISTER */}
      {view==='step-register' && <RegisterForm persistAndLogin={persistAndLogin} showToast={showToast} navigate={navigate} onBack={()=>setView('otp-login')} onSuccess={()=>setShowAvail(true)}/>}
      {showAvail && <AvailabilityModal onClose={()=>{setShowAvail(false);navigate('/dashboard',{replace:true});}}/>}
    </div>
  );
}

/* ── Username/password login ─────────────────────────────── */
function PwdLogin({ setLoginErr, persistAndLogin, showToast, navigate, onBack }) {
  const [u, setU]   = useState(''); const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showAvailPwd, setShowAvailPwd] = useState(false);

  async function doUserPwdLogin() {
    setErr(''); setLoginErr('');
    if(!u.trim()||!p){setErr('Please enter both username and password.');return;}
    setLoading(true);
    try{const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u.trim(),password:p})});const d=await r.json();
      if(d.success){if(d.user.role==='admin'){setErr('Admin accounts must use the Admin tab.');setLoading(false);return;}persistAndLogin(d.token,d.user);showToast('Welcome back! 🩸','success');setShowAvailPwd(true);}else setErr(d.error||'Login failed.');}catch(e){setErr('Cannot connect to server.');}
    setLoading(false);
  }

  return (
    <div id="user-pwd-login-wrap">
      <button onClick={onBack} type="button" style={{display:'inline-flex',alignItems:'center',gap:6,background:'none',border:'none',color:'var(--red)',fontFamily:'var(--font-ui)',fontSize:'0.82rem',fontWeight:600,cursor:'pointer',padding:0,marginBottom:16}}>← Back to OTP Login</button>
      {err && <div className="login-error show">{err}</div>}
      {!showForgot && (
        <div id="user-pwd-signin-fields">
          <div className="login-form-group"><label>Username</label>
            <div className="login-input-wrap"><span className="input-icon">👤</span>
              <input type="text" id="user-login-username" placeholder="Your username" autoComplete="username" value={u} onChange={e=>setU(e.target.value)}
                style={{width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 14px 11px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.9rem',outline:'none'}}/></div></div>
          <div className="login-form-group"><label>Password</label>
            <div className="login-input-wrap"><span className="input-icon">🔒</span>
              <input type="password" id="user-login-password" placeholder="Your password" autoComplete="current-password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doUserPwdLogin()}
                style={{width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'11px 14px 11px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.9rem',outline:'none'}}/></div></div>
          <button className="login-btn" id="user-pwd-login-btn" onClick={doUserPwdLogin} disabled={loading} type="button">{loading?'Signing in…':'Sign In →'}</button>
          <div style={{textAlign:'center',marginTop:10}}>
            <button id="forgot-pwd-link" onClick={()=>setShowForgot(true)} type="button" style={{background:'none',border:'none',color:'var(--text2)',fontFamily:'var(--font-ui)',fontSize:'0.78rem',cursor:'pointer',textDecoration:'underline'}}>🔑 Forgot Password?</button>
          </div>
        </div>
      )}
      {showForgot && <ForgotPwdPanel showToast={showToast} onBack={()=>setShowForgot(false)}/>}
      {showAvailPwd && <AvailabilityModal onClose={()=>{setShowAvailPwd(false);navigate('/dashboard',{replace:true});}}/>}
    </div>
  );
}

/* ── Forgot password panel ───────────────────────────────── */
function ForgotPwdPanel({ showToast, onBack }) {
  const [fpUser, setFpUser] = useState(''); const [fpEmail, setFpEmail] = useState('');
  const [fpNew, setFpNew]   = useState(''); const [fpConfirm, setFpConfirm] = useState('');
  const [fpErr, setFpErr]   = useState(''); const [fpSuc, setFpSuc] = useState('');
  const [loading, setLoading] = useState(false);

  const IS2 = {width:'100%',background:'#fff',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px 10px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

  async function doForgotPassword() {
    setFpErr(''); setFpSuc('');
    if(!fpUser){setFpErr('Username is required.');return;}
    if(!fpEmail||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail)){setFpErr('A valid email address is required.');return;}
    if(!fpNew||fpNew.length<6){setFpErr('New password must be at least 6 characters.');return;}
    if(fpNew!==fpConfirm){setFpErr('Passwords do not match.');return;}
    setLoading(true);
    try{const r=await fetch(API+'/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:fpUser,email:fpEmail,newPassword:fpNew,confirmPassword:fpConfirm})});const d=await r.json();
      if(d.success){setFpSuc('✅ '+(d.message||'Password reset! Please sign in.'));setTimeout(()=>{onBack();showToast('Password reset! Please sign in.','success');},2000);}else setFpErr(d.error||'Reset failed. Check your username and email.');}catch(e){setFpErr('Cannot connect to server.');}
    setLoading(false);
  }

  return (
    <div id="forgot-pwd-panel" style={{marginTop:14,background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:12,padding:16}}>
      <p style={{fontSize:'0.75rem',fontFamily:'var(--font-ui)',color:'var(--text2)',marginBottom:12,lineHeight:1.5}}><strong style={{color:'var(--text)'}}>Reset Password</strong><br/>Enter your username and the email address linked to your account.</p>
      {fpErr && <div className="login-error show" id="fp-error" style={{marginBottom:10}}>{fpErr}</div>}
      {fpSuc && <div className="login-error show" id="fp-success" style={{background:'#EDFBF3',borderColor:'#BBF7D0',color:'#15803D',marginBottom:10}}>{fpSuc}</div>}
      <div className="login-form-group" style={{marginBottom:10}}><div className="login-input-wrap"><span className="input-icon">👤</span><input type="text" id="fp-username" placeholder="Username" autoComplete="off" style={IS2} value={fpUser} onChange={e=>setFpUser(e.target.value)}/></div></div>
      <div className="login-form-group" style={{marginBottom:10}}><div className="login-input-wrap"><span className="input-icon">✉️</span><input type="email" id="fp-email" placeholder="Email address" autoComplete="email" style={IS2} value={fpEmail} onChange={e=>setFpEmail(e.target.value)}/></div></div>
      <div className="login-form-group" style={{marginBottom:10}}><div className="login-input-wrap"><span className="input-icon">🔒</span><input type="password" id="fp-new-password" placeholder="New password (min. 6 chars)" style={IS2} value={fpNew} onChange={e=>setFpNew(e.target.value)}/></div></div>
      <div className="login-form-group" style={{marginBottom:12}}><div className="login-input-wrap"><span className="input-icon">🔒</span><input type="password" id="fp-confirm-password" placeholder="Confirm new password" style={IS2} value={fpConfirm} onChange={e=>setFpConfirm(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doForgotPassword()}/></div></div>
      <button id="fp-btn" onClick={doForgotPassword} disabled={loading} type="button" style={{width:'100%',padding:10,background:'var(--red)',color:'#fff',border:'none',borderRadius:10,fontFamily:'var(--font-ui)',fontSize:'0.88rem',fontWeight:600,cursor:'pointer'}}>{loading?'Resetting…':'🔑 Reset Password'}</button>
    </div>
  );
}

/* ── Register form ───────────────────────────────────────── */
function RegisterForm({ persistAndLogin, showToast, navigate, onBack, onSuccess }) {
  const [mobile, setMobile]   = useState(''); const [otp, setOtp]     = useState('');
  const [otpSent, setOtpSent] = useState(false); const [otpVerified, setOtpVerified] = useState(false);
  const [firstName, setFN]    = useState(''); const [lastName, setLN]  = useState('');
  const [city, setCity]       = useState(''); const [bt, setBt]        = useState('');
  const [email, setEmail]     = useState(''); const [address, setAddr]  = useState('');
  const [lastDon, setLD]      = useState('');
  const [err, setErr]         = useState(''); const [loading, setLoading] = useState(false);
  const [cd, setCd]           = useState(0);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(cd<=0)return;
    timerRef.current=setInterval(()=>setCd(c=>{if(c<=1){clearInterval(timerRef.current);return 0;}return c-1;}),1000);
    return()=>clearInterval(timerRef.current);
  },[cd]);

  async function sendRegOTP(){
    setErr('');
    if(!/^[6-9]\d{9}$/.test(mobile.trim())){setErr('Enter a valid 10-digit mobile number.');return;}
    setLoading(true);
    try{const r=await fetch(API+'/auth/otp/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mobile:mobile.trim(),purpose:'register'})});const d=await r.json();
      if(d.success){if(d.isExistingUser){setErr('This mobile is already registered. Please sign in.');setLoading(false);return;}setOtpSent(true);setCd(60);showToast('OTP sent to +91 '+mobile.trim(),'success');}else setErr(d.error||'Failed to send OTP.');}catch(e){setErr('Cannot connect to server.');}
    setLoading(false);
  }

  function verifyRegOTP(){
    setErr('');
    if(!/^\d{6}$/.test(otp.trim())){setErr('Enter the 6-digit OTP.');return;}
    setOtpVerified(true);showToast('OTP verified!','success');
  }

  async function doOTPRegister(){
    setErr('');
    if(!firstName.trim()){setErr('First name is required.');return;}
    if(!city.trim()){setErr('City is required.');return;}
    if(!bt){setErr('Please select your blood type.');return;}
    if(!otpVerified&&!otp.trim()){setErr('Please verify your mobile with OTP first.');return;}
    const username=firstName.toLowerCase().replace(/\s+/g,'')+mobile.trim().slice(-4);
    setLoading(true);
    try{const r=await fetch(API+'/auth/register-direct',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mobile:mobile.trim(),otp:otp.trim(),username,firstName:firstName.trim(),lastName:lastName.trim()||undefined,bloodType:bt,email:email.trim()||undefined,address:address.trim()||undefined,city:city.trim(),lastDonationDate:lastDon||undefined})});const d=await r.json();
      if(d.success){clearInterval(timerRef.current);persistAndLogin(d.token,d.user);showToast('Welcome, '+firstName+'! You are now registered as a donor. 🩸','success');onSuccess?onSuccess():navigate('/dashboard',{replace:true});}else setErr(d.error||'Registration failed.');}catch(e){setErr('Cannot connect to server.');}
    setLoading(false);
  }

  const IS2 = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

  return (
    <div id="step-register" style={{maxHeight:'62vh',overflowY:'auto',paddingRight:2}}>
      <div style={{background:'var(--red-light)',border:'1px solid rgba(200,16,46,0.15)',borderRadius:10,padding:'13px 15px',marginBottom:16}}>
        <p style={{fontFamily:'var(--font-ui)',fontSize:'0.76rem',color:'var(--text2)',lineHeight:1.5}}><strong style={{color:'var(--red)',display:'block',marginBottom:3}}>🩸 New TN User Registration</strong>Complete your details to create an account and join the donor registry.</p>
      </div>
      {err && <div className="login-error show" style={{marginBottom:10}}>{err}</div>}

      <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr',gap:10}}>
        {/* Mobile + OTP */}
        <div className="form-group" style={{gridColumn:'1/-1'}}>
          <label>Mobile Number * <span style={{color:'var(--text3)',fontWeight:400}}>(used for OTP login)</span></label>
          <div style={{display:'flex',gap:8}}>
            <div className="login-input-wrap" style={{flex:1}}><span className="input-icon">📱</span>
              <input type="tel" id="reg-mobile-input" placeholder="10-digit mobile number" maxLength={10} value={mobile} onChange={e=>setMobile(e.target.value)} disabled={otpSent}
                style={{width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px 10px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'}}/></div>
            <button id="reg-send-otp-btn" onClick={sendRegOTP} disabled={loading||(otpSent&&cd>0)} type="button"
              style={{padding:'10px 14px',background:'var(--red)',color:'#fff',border:'none',borderRadius:10,fontFamily:'var(--font-ui)',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              {otpSent&&cd>0?`${cd}s`:'📲 Send OTP'}
            </button>
          </div>
          <div style={{marginTop:5,minHeight:18}}><span id="reg-otp-timer" style={{fontSize:'0.72rem',color:'var(--text3)',fontFamily:'var(--font-ui)'}}>{otpSent&&cd>0?`Resend in ${cd}s`:''}</span></div>
        </div>

        {otpSent && <div className="form-group" id="reg-otp-code-row" style={{gridColumn:'1/-1'}}>
          <label>Enter OTP *</label>
          <div style={{display:'flex',gap:8}}>
            <div className="login-input-wrap" style={{flex:1}}><span className="input-icon">🔐</span>
              <input type="text" id="reg-otp-code" placeholder="6-digit OTP" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)}
                style={{width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px 10px 40px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'1rem',letterSpacing:'0.25em',outline:'none'}}/></div>
            {!otpVerified
              ? <button id="reg-mobile-verify-btn" onClick={verifyRegOTP} type="button" style={{padding:'10px 14px',background:'var(--red)',color:'#fff',border:'none',borderRadius:10,fontFamily:'var(--font-ui)',fontSize:'0.8rem',fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>✅ Verify</button>
              : <span style={{fontSize:'0.78rem',fontWeight:700,color:'#15803D',whiteSpace:'nowrap',alignSelf:'center',flexShrink:0}}>✅ Verified</span>}
          </div>
        </div>}

        <input type="hidden" id="reg-username-new"/>
        <div className="form-group"><label>First Name *</label><input type="text" id="reg-firstName" placeholder="First name" style={IS2} value={firstName} onChange={e=>setFN(e.target.value)}/></div>
        <div className="form-group"><label>Last Name <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input type="text" id="reg-lastName" placeholder="Last name" style={IS2} value={lastName} onChange={e=>setLN(e.target.value)}/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>City *</label><input type="text" id="reg-city" placeholder="Your city" style={IS2} value={city} onChange={e=>setCity(e.target.value)}/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Blood Type *</label>
          <select id="reg-bloodtype-new" value={bt} onChange={e=>setBt(e.target.value)} style={{width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none',cursor:'pointer'}}>
            <option value="">— Select —</option>{BT.map(b=><option key={b} value={b}>{b}</option>)}
          </select></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Email Address <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input type="email" id="reg-email-new" placeholder="you@example.com" style={IS2} value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Address <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input type="text" id="reg-address" placeholder="Your address" style={IS2} value={address} onChange={e=>setAddr(e.target.value)}/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Last Donation Date <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input type="date" id="reg-lastDonation" style={IS2} value={lastDon} onChange={e=>setLD(e.target.value)}/></div>
      </div>

      <button className="login-btn" id="reg-submit-btn" onClick={doOTPRegister} disabled={loading} type="button" style={{marginTop:14}}>{loading?'Registering…':'✨ Complete Registration'}</button>
      <button onClick={onBack} type="button" style={{width:'100%',marginTop:8,padding:10,background:'none',border:'1.5px solid var(--border)',borderRadius:10,color:'var(--text2)',fontFamily:'var(--font-ui)',fontSize:'0.85rem',cursor:'pointer'}}>← Back to Login</button>
    </div>
  );
}

/* ── Contact Support Modal ───────────────────────────────── */
function ContactSupportModal({ onClose }) {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [file,    setFile]    = useState(null);
  const [error,   setError]   = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const IS2 = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

  async function send() {
    setError('');
    if (!name.trim())    { setError('Your name is required.'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('A valid email address is required.'); return; }
    if (!subject.trim()) { setError('Subject is required.'); return; }
    if (!message.trim()) { setError('Message is required.'); return; }
    setSending(true);
    try {
      let attachments = '';
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch(API + '/support/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) throw new Error('File upload failed. Please try again.');
        const uploadData = await uploadRes.json();
        attachments = JSON.stringify([{ name: file.name, url: uploadData.secure_url }]);
      }
      const res  = await fetch(API + '/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromName: name.trim(), fromEmail: email.trim(), subject: subject.trim(), message: message.trim(), attachments }),
      });
      const data = await res.json();
      if (data.success) setSent(true);
      else setError(data.error || 'Failed to send message. Please try again.');
    } catch(e) { setError(e.message || 'Cannot connect to server.'); }
    setSending(false);
  }

  return (
    <div className="modal-overlay open" id="contact-support-modal" style={{zIndex:9500}} onClick={onClose}>
      <div className="modal" style={{maxWidth:460}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>💬 Contact Support</h3>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        {sent ? (
          <div style={{textAlign:'center',padding:'24px 0'}}>
            <div style={{fontSize:'2.5rem',marginBottom:12}}>✅</div>
            <h4 style={{fontFamily:'var(--font-ui)',color:'#15803D',marginBottom:8}}>Message Sent!</h4>
            <p style={{fontSize:'0.84rem',color:'var(--text2)',fontFamily:'var(--font-ui)'}}>We'll get back to you at <strong>{email}</strong>.</p>
            <button className="btn btn-primary" style={{marginTop:20}} onClick={onClose} type="button">Close</button>
          </div>
        ) : (<>
          <div style={{background:'var(--red-light)',border:'1px solid rgba(200,16,46,0.15)',borderRadius:10,padding:'12px 15px',marginBottom:16}}>
            <p style={{fontFamily:'var(--font-ui)',fontSize:'0.76rem',color:'var(--text2)',lineHeight:1.5}}>Having trouble logging in or need help? Send a message to our support team and we'll get back to you.</p>
          </div>
          {error && <div className="login-error show" id="cs-error" style={{marginBottom:10}}>{error}</div>}
          <div className="form-grid" style={{gridTemplateColumns:'1fr',gap:12}}>
            <div className="form-group"><label>Your Name *</label><input type="text" id="cs-name" placeholder="Your full name" style={IS2} value={name} onChange={e=>setName(e.target.value)}/></div>
            <div className="form-group"><label>Your Email *</label><input type="email" id="cs-email" placeholder="your@email.com" style={IS2} value={email} onChange={e=>setEmail(e.target.value)}/></div>
            <div className="form-group"><label>Subject *</label><input type="text" id="cs-subject" placeholder="e.g. Cannot log in to my account" style={IS2} value={subject} onChange={e=>setSubject(e.target.value)}/></div>
            <div className="form-group"><label>Message *</label><textarea id="cs-message" placeholder="Describe your issue in detail…" rows={4} style={{...IS2,resize:'vertical'}} value={message} onChange={e=>setMessage(e.target.value)}/></div>
            <div className="form-group">
              <label>Attachment <span style={{color:'var(--text3)',fontWeight:400}}>(optional — screenshot or file)</span></label>
              <input type="file" id="cs-attachment" accept="image/*,.pdf,.doc,.docx,.txt" style={{...IS2,cursor:'pointer'}} onChange={e=>setFile(e.target.files[0]||null)}/>
            </div>
          </div>
          <div className="modal-footer" style={{marginTop:16}}>
            <button className="btn btn-outline" onClick={onClose} type="button">Cancel</button>
            <button className="btn btn-primary" id="cs-send-btn" onClick={send} disabled={sending} type="button">{sending?'Sending…':'📧 Send Message'}</button>
          </div>
        </>)}
      </div>
    </div>
  );
}

/* ── Availability Modal (shown after TN user login) ─────── */
function AvailabilityModal({ onClose }) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  async function setAvailability(isAvailable) {
    setSaving(true);
    try {
      const res = await fetch(API + '/auth/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ isAvailable }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(isAvailable ? '✅ Marked as available to donate!' : '❌ Marked as unavailable.', 'success');
      } else {
        showToast(data.error || 'Could not update availability.', 'error');
      }
    } catch(e) {
      showToast('Could not update availability. Please update it from your profile.', 'error');
    }
    onClose();
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" id="availability-modal" style={{zIndex:10000}}>
      <div className="modal" style={{maxWidth:400,textAlign:'center'}}>
        <div style={{fontSize:'2.5rem',marginBottom:8}}>🩸</div>
        <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',color:'var(--text)',marginBottom:6}}>Are you available to donate blood?</h3>
        <p style={{fontSize:'0.82rem',color:'var(--text2)',fontFamily:'var(--font-ui)',marginBottom:24,lineHeight:1.6}}>
          Let us know your current donation availability. This helps match you with urgent blood requests.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <button onClick={()=>setAvailability(true)} disabled={saving} type="button"
            style={{width:'100%',padding:14,background:'var(--red)',color:'#fff',border:'none',borderRadius:12,fontFamily:'var(--font-ui)',fontSize:'0.95rem',fontWeight:700,cursor:'pointer'}}>
            ✅ Yes, I'm Available to Donate
          </button>
          <button onClick={()=>setAvailability(false)} disabled={saving} type="button"
            style={{width:'100%',padding:14,background:'none',border:'2px solid var(--border)',borderRadius:12,fontFamily:'var(--font-ui)',fontSize:'0.95rem',fontWeight:600,color:'var(--text2)',cursor:'pointer'}}>
            ❌ Not Available Right Now
          </button>
        </div>
      </div>
    </div>
  );
}
