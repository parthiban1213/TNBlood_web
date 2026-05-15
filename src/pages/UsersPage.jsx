import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const BT = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function UsersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [all, setAll]     = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalUser, setModalUser] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/users');
    if (res.success) {
      setAll(res.data);
      document.getElementById('um-total')?.setAttribute('data-val', res.data.length);
    } else showToast(res.error || 'Failed to load users.', 'error');
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const q     = search.toLowerCase();
  const rows  = q ? all.filter(u => (u.username||'').includes(q)||(u.email||'').includes(q)||(u.mobile||'').includes(q)) : all;
  const admins = all.filter(u => u.role === 'admin').length;
  const users  = all.filter(u => u.role === 'user').length;
  const me     = user?.username;

  async function doDelete() {
    const res = await apiFetch('/users/' + deleteTarget._id, { method: 'DELETE' });
    if (res.success) { showToast(res.message); setAll(p => p.filter(u => u._id !== deleteTarget._id)); setDeleteTarget(null); }
    else showToast(res.error || 'Failed to delete.', 'error');
  }

  return (
    <div id="page-users" data-testid="page-users" aria-label="User Management page" className="page">
      <div className="page-header-row page-header">
        <div><h2>User <span>Management</span></h2><p>Add, edit, and manage TN system accounts</p></div>
        <div><button id="btn-open-user-modal" className="btn btn-primary" onClick={()=>setModalUser(null)} type="button">➕ Add User</button></div>
      </div>

      {/* Summary cards */}
      <div style={{display:'flex',gap:14,flexWrap:'wrap',marginBottom:22}}>
        {[['👥','um-total',all.length,'Total Users'],['🛡️','um-admins',admins,'Admins'],['👤','um-employees',users,'TN User']].map(([icon,id,val,label])=>(
          <div key={id} className="card" style={{padding:'16px 22px',display:'flex',alignItems:'center',gap:12,flex:1,minWidth:140}}>
            <span style={{fontSize:'1.6rem'}}>{icon}</span>
            <div><div id={id} style={{fontFamily:'var(--font-ui)',fontSize:'1.5rem',fontWeight:800,color:id==='um-admins'?'var(--red)':'var(--text)'}}>{loading?'—':val}</div><div style={{fontSize:'0.75rem',color:'var(--text2)'}}>{label}</div></div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card" style={{padding:'14px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:10}}>
        <span style={{color:'var(--text3)',fontSize:'1rem'}}>🔍</span>
        <input id="um-search" data-testid="user-search-input" aria-label="Search users" type="text"
          placeholder="Search by username or email…"
          style={{flex:1,border:'none',outline:'none',background:'transparent',fontFamily:'var(--font-body)',fontSize:'0.9rem',color:'var(--text)'}}
          value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div id="um-table-wrap" data-testid="users-table-wrap" style={{overflowX:'auto'}}>
          {loading ? <div className="spinner" style={{margin:'32px auto'}}/> : rows.length === 0 ? (
            <div className="empty-state" style={{padding:32}}><div className="emoji">👥</div><p>No users found.</p></div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
              <thead><tr style={{background:'var(--bg3)',borderBottom:'2px solid var(--border)'}}>
                {['USERNAME','MOBILE','ROLE','BLOOD TYPE','CREATED','ACTIONS'].map((h,i)=>(
                  <th key={h} style={{padding:'12px 18px',textAlign:i===5?'right':'left',fontFamily:'var(--font-ui)',fontSize:'0.78rem',color:'var(--text2)',fontWeight:600}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map(u => {
                  const isMe = u.username === me;
                  return (
                    <tr key={u._id} data-testid="user-row" data-id={u._id} style={{borderBottom:'1px solid var(--border2)'}}>
                      <td style={{padding:'13px 18px',fontWeight:600,color:'var(--text)'}}>
                        {u.username}
                        {isMe && <span style={{fontSize:'0.68rem',background:'var(--red-light)',color:'var(--red)',padding:'2px 7px',borderRadius:20,fontFamily:'var(--font-ui)',marginLeft:6}}>You</span>}
                      </td>
                      <td style={{padding:'13px 18px',color:'var(--text2)'}}>{u.mobile || <span style={{color:'var(--text3)'}}>—</span>}</td>
                      <td style={{padding:'13px 18px'}}>
                        {u.role === 'admin'
                          ? <span style={{background:'#FEF3C7',color:'#92400E',padding:'3px 10px',borderRadius:20,fontSize:'0.75rem',fontFamily:'var(--font-ui)',fontWeight:600}}>🛡️ Admin</span>
                          : <span style={{background:'var(--border2)',color:'var(--text2)',padding:'3px 10px',borderRadius:20,fontSize:'0.75rem',fontFamily:'var(--font-ui)',fontWeight:600}}>👤 User</span>}
                      </td>
                      <td style={{padding:'13px 18px'}}>{u.bloodType ? <span className="blood-badge">{u.bloodType}</span> : <span style={{color:'var(--text3)'}}>—</span>}</td>
                      <td style={{padding:'13px 18px',color:'var(--text2)'}}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{padding:'13px 18px',textAlign:'right'}}>
                        <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                          <button data-testid="user-edit-btn" data-id={u._id} className="btn btn-outline btn-sm" onClick={()=>setModalUser(u)}>✏️ Edit</button>
                          {!isMe && <button data-testid="user-delete-btn" data-id={u._id} className="btn btn-danger btn-sm" onClick={()=>setDeleteTarget(u)}>🗑</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalUser !== undefined && <UserModal u={modalUser} onClose={()=>setModalUser(undefined)} onSaved={saved=>{if(saved._id&&modalUser?._id)setAll(p=>p.map(x=>x._id===saved._id?saved:x));else setAll(p=>[saved,...p]);setModalUser(undefined);showToast(saved._new?'User created!':'User updated!');load();}}/>}
      {deleteTarget && <ConfirmModal title="Delete User" body={`Delete user "${deleteTarget.username}"? They will lose all access immediately. This cannot be undone.`} confirmLabel="Delete" danger onConfirm={doDelete} onCancel={()=>setDeleteTarget(null)}/>}
    </div>
  );
}

function UserModal({ u, onClose, onSaved }) {
  const isEdit = !!u?._id;
  const [f, setF] = useState({mobile:u?.mobile||'',firstName:u?.firstName||'',lastName:u?.lastName||'',city:u?.city||'',bloodType:u?.bloodType||'',email:u?.email||'',username:u?.username||'',password:''});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const up = (k,v) => setF(p=>({...p,[k]:v}));
  const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:10,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

  async function save() {
    setError('');
    if (!f.mobile)                              { setError('Mobile number is required.'); return; }
    if (!/^[6-9]\d{9}$/.test(f.mobile))         { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (!f.firstName.trim())                    { setError('First name is required.'); return; }
    if (!f.bloodType)                           { setError('Blood type is required.'); return; }
    if (!f.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { setError('A valid email address is required.'); return; }
    if (!f.username||f.username.length<3)       { setError('Username must be at least 3 characters.'); return; }
    if (!isEdit && !f.password)                 { setError('Password is required for new users.'); return; }
    if (f.password && f.password.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    const body = {mobile:f.mobile,firstName:f.firstName.trim(),lastName:f.lastName.trim()||undefined,city:f.city.trim()||undefined,bloodType:f.bloodType,email:f.email.trim(),username:f.username.trim(),role:'user'};
    if (f.password) body.password = f.password;
    setSaving(true);
    const res = isEdit ? await apiFetch('/users/'+u._id,{method:'PUT',body:JSON.stringify(body)}) : await apiFetch('/users',{method:'POST',body:JSON.stringify(body)});
    if (res.success) onSaved({...res.data,_new:!isEdit});
    else setError(res.error||'Save failed.');
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" style={{maxWidth:440}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 id="user-modal-title">{isEdit?'Edit User':'Add User'}</h3><button id="user-modal-close-btn" className="modal-close" onClick={onClose}>✕</button></div>

        {error && <div className="login-error show" id="um-error" data-testid="user-modal-error" style={{marginBottom:12}}>{error}</div>}

        <div className="form-grid" style={{gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div className="form-group" style={{gridColumn:'1/-1'}}>
            <label>Mobile Number * <span style={{color:'var(--text3)',fontWeight:400}}>(used for OTP login)</span></label>
            <div className="login-input-wrap"><span className="input-icon">📱</span>
              <input id="um-mobile" type="tel" maxLength={10} placeholder="10-digit mobile" value={f.mobile} onChange={e=>up('mobile',e.target.value)} style={{...IS,padding:'10px 14px 10px 40px'}}/>
            </div>
          </div>
          <div className="form-group"><label>First Name *</label><input id="um-firstName" type="text" placeholder="First name" style={IS} value={f.firstName} onChange={e=>up('firstName',e.target.value)}/></div>
          <div className="form-group"><label>Last Name <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input id="um-lastName" type="text" placeholder="Last name" style={IS} value={f.lastName} onChange={e=>up('lastName',e.target.value)}/></div>
          <div className="form-group" style={{gridColumn:'1/-1'}}>
            <label>Blood Type * <span style={{color:'var(--text3)',fontWeight:400}}>(for notifications & donor list)</span></label>
            <select id="um-bloodtype" data-testid="um-bloodtype" style={{...IS,cursor:'pointer'}} value={f.bloodType} onChange={e=>up('bloodType',e.target.value)}>
              <option value="">— Select blood type —</option>{BT.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="form-group" style={{gridColumn:'1/-1'}}><label>City <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input id="um-city" type="text" placeholder="e.g. Chennai" style={IS} value={f.city} onChange={e=>up('city',e.target.value)}/></div>
          <div className="form-group" style={{gridColumn:'1/-1'}}><label>Email Address *</label><input id="um-email" type="email" placeholder="e.g. jsmith@example.com" style={IS} value={f.email} onChange={e=>up('email',e.target.value)}/></div>
          <div className="form-group" style={{gridColumn:'1/-1'}}>
            <label>Username * <span style={{color:'var(--text3)',fontWeight:400}}>(min. 3 chars — for password login)</span></label>
            <div className="login-input-wrap"><span className="input-icon">👤</span>
              <input id="um-username" type="text" placeholder="Choose a username" autoComplete="off" value={f.username} onChange={e=>up('username',e.target.value)} style={{...IS,padding:'10px 14px 10px 40px'}}/>
            </div>
          </div>
          <div className="form-group" style={{gridColumn:'1/-1'}}>
            <label id="um-password-label">{isEdit?'New Password':'Password *'}</label>
            <div className="login-input-wrap"><span className="input-icon">🔒</span>
              <input id="um-password" type="password" placeholder="At least 6 characters" value={f.password} onChange={e=>up('password',e.target.value)} style={{...IS,padding:'10px 14px 10px 40px'}} autoComplete="new-password"/>
            </div>
            {isEdit && <p id="um-password-hint" style={{fontSize:'0.73rem',color:'var(--text3)',marginTop:4}}>Leave blank to keep the current password.</p>}
          </div>
        </div>

        <div className="modal-footer">
          <button id="user-modal-cancel-btn" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" id="um-save-btn" onClick={save} disabled={saving}>{saving?'Saving…':isEdit?'💾 Save Changes':'💾 Save User'}</button>
        </div>
      </div>
    </div>
  );
}
