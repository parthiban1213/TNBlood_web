import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatDate, getInitials, getDonorAvatar } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ExportModal from './ExportModal.jsx';
import BulkModal from '../components/BulkModal.jsx';

const BT = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

export default function DonorsPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [donors, setDonors]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const [bloodFilter, setBloodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [donorView, setDonorView] = useState('table');
  const [formOpen, setFormOpen]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [viewId, setViewId]       = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkOpen, setBulkOpen]   = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const res = await apiFetch('/donors');
    if (res.success) setDonors(res.data);
    else { setError(res.error||'Could not load donors.'); showToast(res.error||'Could not load donors. Please refresh.','error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  // Handle action query params from sidebar buttons
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('action')==='register'){ setEditId(null); setFormOpen(true); navigate('/donors',{replace:true}); }
    if (p.get('action')==='export')  { setExportOpen(true);               navigate('/donors',{replace:true}); }
  }, [location.search]);

  useSocketEvent('donor:created', d => setDonors(p=>[d,...p]));
  useSocketEvent('donor:deleted', ({id}) => setDonors(p=>p.filter(d=>d._id!==id)));
  useSocketEvent('donor:updated', d => setDonors(p=>p.map(x=>x._id===d._id?d:x)));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return donors.filter(d => {
      const nm = (d.firstName+' '+d.lastName+' '+(d.address||'')).toLowerCase().includes(q);
      const bt = !bloodFilter || d.bloodType === bloodFilter;
      const st = statusFilter===''||String(d.isAvailable)===statusFilter;
      return nm && bt && st;
    });
  }, [donors, search, bloodFilter, statusFilter]);

  async function doDelete() {
    const res = await apiFetch('/donors/'+deleteTarget._id, { method:'DELETE' });
    if (res.success) { setDonors(p=>p.filter(d=>d._id!==deleteTarget._id)); showToast(res.message||'Donor removed.'); setDeleteTarget(null); }
    else showToast(res.error||'Failed to delete.','error');
  }

  function setView(v, btn) {
    setDonorView(v);
    document.querySelectorAll('.view-toggle button').forEach(b=>b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }

  const adminActions = (d) => (<>
    <button data-testid="donor-view-btn" data-id={d._id} className="btn btn-outline btn-sm" onClick={()=>setViewId(d._id)}>👁 View</button>
    <button data-testid="donor-edit-btn" data-id={d._id} className="btn btn-outline btn-sm" onClick={()=>{setEditId(d._id);setFormOpen(true);}}>✏️ Edit</button>
    <button data-testid="donor-delete-btn" data-id={d._id} className="btn btn-danger btn-sm" onClick={()=>setDeleteTarget(d)}>🗑</button>
  </>);
  const userActions = (d) => (<>
    <button data-testid="donor-view-btn" data-id={d._id} className="btn btn-outline btn-sm" onClick={()=>setViewId(d._id)}>👁 View</button>
    <span className="lock-badge" style={{fontSize:'0.65rem'}}>🔒 No edit/delete</span>
  </>);

  return (
    <div id="page-donors" className="page">
      <div className="page-header-row page-header">
        <div><h2>Donor <span>Registry</span></h2><p>Browse, search and manage registered blood donors</p></div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button id="btn-open-donor-modal" className="btn btn-primary" onClick={()=>{setEditId(null);setFormOpen(true);}} type="button">➕ Register Donor</button>
          {isAdmin && <>
            <button className="btn btn-outline" id="bulk-upload-btn" onClick={()=>setBulkOpen(true)} type="button">📥 Bulk Upload</button>
            <button className="btn btn-outline" id="export-btn" onClick={()=>setExportOpen(true)} type="button">📤 Export</button>
          </>}
        </div>
      </div>

      {/* Filter bar — exact original class names */}
      <div className="filter-bar">
        <div className="search-bar">
          <span style={{color:'var(--text3)'}}>🔍</span>
          <input type="text" id="donor-search" placeholder="Search by name or address…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="filter-select" id="filter-blood" value={bloodFilter} onChange={e=>setBloodFilter(e.target.value)}>
          <option value="">All Blood Types</option>
          {BT.map(b=><option key={b}>{b}</option>)}
        </select>
        <select className="filter-select" id="filter-status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>
        <div className="view-toggle">
          <button id="donor-view-table" className={donorView==='table'?'active':''} onClick={e=>setView('table',e.target)} title="Table">☰</button>
          <button id="donor-view-cards" className={donorView==='cards'?'active':''} onClick={e=>setView('cards',e.target)} title="Cards">⊞</button>
        </div>
      </div>

      <div className="card">
        <div id="donors-view" data-testid="donors-view">
          {loading ? <div className="spinner"/> : error ? (
            <div className="empty-state"><div className="emoji">⚠️</div><h4>Failed to load donors</h4><p>{error}</p><button id="btn-donors-retry" className="btn btn-outline" style={{marginTop:12}} onClick={load}>↻ Retry</button></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state"><div className="emoji">👤</div><h4>No donors found</h4><p>Register a new donor or adjust filters.</p></div>
          ) : donorView === 'cards' ? (
            <div className="donor-grid">
              {filtered.map(d=>(
                <div key={d._id} data-testid="donor-card" data-id={d._id} className="donor-card">
                  <div className="donor-card-top">
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div className="donor-avatar" data-initials={getInitials(d.firstName,d.lastName)} dangerouslySetInnerHTML={{__html:getDonorAvatar()}}/>
                      <div className="donor-card-name"><h4>{d.firstName} {d.lastName}</h4><p>{d.city||d.address||d.email}</p></div>
                    </div>
                    <div className="donor-card-bt">{d.bloodType}</div>
                  </div>
                  <div className="donor-card-info">
                    <div className="donor-info-item"><span>Phone</span>{d.phone}</div>
                    <div className="donor-info-item"><span>City</span>{d.city||'—'}</div>
                    <div className="donor-info-item"><span>Status</span><span className={`status-dot ${d.isAvailable?'available':'unavailable'}`}>{d.isAvailable?'Available':'Unavailable'}</span></div>
                    <div className="donor-info-item"><span>Last Donated</span>{formatDate(d.lastDonationDate)}</div>
                  </div>
                  <div className="donor-card-actions">{isAdmin?adminActions(d):userActions(d)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Name</th><th>Blood Type</th><th>Phone</th><th>Last Donation</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(d=>(
                  <tr key={d._id} data-testid="donor-row" data-id={d._id}>
                    <td className="bold">{d.firstName} {d.lastName}</td>
                    <td><span className="blood-badge">{d.bloodType}</span></td>
                    <td>{d.phone}</td>
                    <td>{formatDate(d.lastDonationDate)}</td>
                    <td><span className={`status-dot ${d.isAvailable?'available':'unavailable'}`}>{d.isAvailable?'Available':'Unavailable'}</span></td>
                    <td style={{display:'flex',gap:4,alignItems:'center'}}>
                      <button data-testid="donor-row-view-btn" data-id={d._id} className="btn btn-ghost btn-sm" onClick={()=>setViewId(d._id)}>👁</button>
                      {isAdmin?<>
                        <button data-testid="donor-row-edit-btn" data-id={d._id} className="btn btn-ghost btn-sm" onClick={()=>{setEditId(d._id);setFormOpen(true);}}>✏️</button>
                        <button data-testid="donor-row-delete-btn" data-id={d._id} className="btn btn-ghost btn-sm" style={{color:'#DC2626'}} onClick={()=>setDeleteTarget(d)}>🗑</button>
                      </>:<span className="lock-badge">🔒</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {formOpen && <DonorFormModal donorId={editId} onClose={()=>setFormOpen(false)} onSaved={d=>{if(editId)setDonors(p=>p.map(x=>x._id===d._id?d:x));else setDonors(p=>[d,...p]);setFormOpen(false);showToast(editId?'Donor updated!':'Donor registered!');}}/>}
      {viewId   && <DonorDetailModal donorId={viewId} isAdmin={isAdmin} onClose={()=>setViewId(null)} onEdit={id=>{setViewId(null);setEditId(id);setFormOpen(true);}} onDelete={d=>{setViewId(null);setDeleteTarget(d);}}/>}
      {bulkOpen && isAdmin && <DonorBulkModal onClose={()=>setBulkOpen(false)} onDone={()=>{load();showToast('Bulk upload complete!');}}/>}
      {exportOpen && isAdmin && <ExportModal onClose={()=>setExportOpen(false)}/>}
      {deleteTarget && <ConfirmModal title="Remove Donor" body={`Remove "${deleteTarget.firstName} ${deleteTarget.lastName}" from the registry? This cannot be undone.`} confirmLabel="Remove" danger onConfirm={doDelete} onCancel={()=>setDeleteTarget(null)}/>}
    </div>
  );
}

function DonorFormModal({ donorId, onClose, onSaved }) {
  const [f, setF] = useState({firstName:'',lastName:'',phone:'',email:'',address:'',city:'',bloodType:'',lastDonationDate:'',isAvailable:'true'});
  const [loading, setLoading] = useState(!!donorId);
  const [saving, setSaving]   = useState(false);
  const [dupWarn, setDupWarn] = useState('');
  const up = (k,v) => setF(p=>({...p,[k]:v}));

  useEffect(() => {
    if (!donorId) return;
    apiFetch('/donors/'+donorId).then(res => {
      if (res.success) { const d=res.data; setF({firstName:d.firstName||'',lastName:d.lastName||'',phone:d.phone||'',email:d.email||'',address:d.address||'',city:d.city&&d.city!=='N/A'?d.city:'',bloodType:d.bloodType||'',lastDonationDate:d.lastDonationDate?d.lastDonationDate.split('T')[0]:'',isAvailable:String(d.isAvailable)}); }
      setLoading(false);
    });
  }, [donorId]);

  async function checkDup() {
    if (donorId || !f.email.trim()) return;
    const res = await apiFetch('/donors?email='+encodeURIComponent(f.email.trim()));
    if (res.success && res.data?.length > 0) { const d=res.data[0]; setDupWarn(`A donor with this email already exists: ${d.firstName} ${d.lastName} (${d.bloodType}, ${d.email}).`); }
    else setDupWarn('');
  }

  async function save(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('save-donor-btn');
    if (btn) { btn.disabled=true; btn.textContent='Saving…'; }
    const body = {firstName:f.firstName,lastName:f.lastName||undefined,phone:f.phone,email:f.email||undefined,address:f.address,city:f.city||'N/A',country:'N/A',bloodType:f.bloodType,lastDonationDate:f.lastDonationDate||undefined,isAvailable:f.isAvailable==='true'};
    setSaving(true);
    const res = donorId ? await apiFetch('/donors/'+donorId,{method:'PUT',body:JSON.stringify(body)}) : await apiFetch('/donors',{method:'POST',body:JSON.stringify(body)});
    if (res.success) { setDupWarn(''); onSaved(res.data); }
    else { if (res.status===409||res.error?.toLowerCase().includes('already exists')) setDupWarn(res.error||'A donor with this information already exists.'); }
    if (btn) { btn.disabled=false; btn.textContent='💾 Save Donor'; }
    setSaving(false);
  }

  const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

  return (
    <div className="modal-overlay open" id="donor-modal" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 id="donor-modal-title">{donorId?'Edit Donor':'Register Donor'}</h3><button id="donor-modal-close-btn" className="modal-close" onClick={onClose}>✕</button></div>
        <form id="donor-form" data-testid="donor-form" onSubmit={save}>
          <input type="hidden" id="donor-id" value={donorId||''}/>
          {dupWarn && <div id="donor-dup-warn" style={{background:'#FFF7ED',border:'1.5px solid #FED7AA',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:'0.82rem',color:'#92400E',fontFamily:'var(--font-ui)'}}><strong>⚠️ Duplicate Detected</strong><br/><span id="donor-dup-msg">{dupWarn}</span></div>}
          {loading ? <div className="spinner"/> : (<>
            <div id="donor-section-personal" className="section-divider">Personal Information</div>
            <div className="form-grid">
              <div className="form-group"><label>First Name *</label><input type="text" id="d-firstName" required placeholder="e.g. Arjun" style={IS} value={f.firstName} onChange={e=>up('firstName',e.target.value)}/></div>
              <div className="form-group"><label>Last Name <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input type="text" id="d-lastName" placeholder="e.g. Kumar" style={IS} value={f.lastName} onChange={e=>up('lastName',e.target.value)}/></div>
            </div>
            <div id="donor-section-contact" className="section-divider">Contact Details</div>
            <div className="form-grid">
              <div className="form-group"><label>Phone Number *</label><input type="tel" id="d-phone" required placeholder="+91 98765 43210" style={IS} value={f.phone} onChange={e=>up('phone',e.target.value)}/></div>
              <div className="form-group"><label>Email Address <span style={{color:'var(--text3)',fontWeight:400}}>(optional)</span></label><input type="email" id="d-email" placeholder="arjun@email.com" style={IS} value={f.email} onChange={e=>up('email',e.target.value)} onBlur={checkDup}/></div>
              <div className="form-group full"><label>Address</label><input type="text" id="d-address" placeholder="Street, City, State, Country" style={IS} value={f.address} onChange={e=>up('address',e.target.value)}/></div>
              <div className="form-group"><label>City</label><input type="text" id="d-city" placeholder="e.g. Chennai" style={IS} value={f.city} onChange={e=>up('city',e.target.value)}/></div>
            </div>
            <div id="donor-section-donation" className="section-divider">Donation Details</div>
            <div className="form-grid">
              <div className="form-group"><label>Blood Type *</label>
                <select id="d-bloodType" required style={{...IS,cursor:'pointer'}} value={f.bloodType} onChange={e=>up('bloodType',e.target.value)}>
                  <option value="">Select blood type</option>{BT.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Last Donation Date</label><input type="date" id="d-lastDonation" style={IS} value={f.lastDonationDate} onChange={e=>up('lastDonationDate',e.target.value)}/></div>
              <div className="form-group full"><label>Availability Status *</label>
                <div style={{display:'flex',gap:10,marginTop:2}}>
                  {[['true','✅ Available — ready to donate'],['false','❌ Unavailable — not currently eligible']].map(([v,l])=>(
                    <label key={v} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'10px 16px',borderRadius:9,border:'1.5px solid #DDE2EF',background:'#F7F9FC',flex:1,fontSize:'0.88rem',color:'#18213A',textTransform:'none',letterSpacing:0,fontWeight:400}}>
                      <input type="radio" name="d-available" id={`d-available-${v}`} value={v} checked={f.isAvailable===v} onChange={()=>up('isAvailable',v)} style={{width:16,height:16,flexShrink:0}}/>{l}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>)}
        </form>
        <div className="modal-footer">
          <button id="donor-modal-cancel-btn" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} id="save-donor-btn" type="button">💾 Save Donor</button>
        </div>
      </div>
    </div>
  );
}

function DonorDetailModal({ donorId, isAdmin, onClose, onEdit, onDelete }) {
  const [d, setD] = useState(null);
  useEffect(() => { apiFetch('/donors/'+donorId).then(res=>{if(res.success)setD(res.data);}); }, [donorId]);
  if (!d) return <div className="modal-overlay open" id="detail-modal"><div className="modal"><div className="spinner" style={{margin:40}}/></div></div>;
  const fields=[['First Name',d.firstName],['Last Name',d.lastName],['Phone',d.phone],['Email',d.email||'—'],['Address',d.address||'—'],['City',d.city||'—'],['Blood Type',d.bloodType],['Last Donation',formatDate(d.lastDonationDate)],['Registered',formatDate(d.createdAt)]];
  return (
    <div className="modal-overlay open" id="detail-modal" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>Donor Details</h3><button id="detail-modal-close-btn" className="modal-close" onClick={onClose}>✕</button></div>
        <div id="detail-content">
          <div style={{display:'flex',alignItems:'center',gap:15,marginBottom:18,padding:16,background:'var(--red-light)',borderRadius:12,border:'1px solid rgba(200,16,46,0.1)'}}>
            <div className="donor-avatar" data-initials={getInitials(d.firstName,d.lastName)} style={{width:54,height:54,borderRadius:13,flexShrink:0}} dangerouslySetInnerHTML={{__html:getDonorAvatar()}}/>
            <div style={{flex:1}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.55rem',color:'var(--text)'}}>{d.firstName} {d.lastName}</h2>
              <p style={{color:'var(--text2)',fontSize:'0.82rem',marginTop:2}}>{d.email}</p>
              <span className={`status-dot ${d.isAvailable?'available':'unavailable'}`} style={{marginTop:5,display:'inline-flex'}}>{d.isAvailable?'Available to donate':'Currently unavailable'}</span>
            </div>
            <div style={{fontFamily:'var(--font-display)',fontSize:'2.5rem',fontWeight:700,color:'var(--red)',lineHeight:1}}>{d.bloodType}</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {fields.map(([k,v])=><div key={k} className="detail-field"><div className="dk">{k}</div><div className="dv">{v||'—'}</div></div>)}
          </div>
          <div style={{marginTop:16,display:'flex',gap:8,justifyContent:'flex-end'}}>
            {isAdmin?<>
              <button data-testid="donor-detail-edit-btn" data-id={d._id} className="btn btn-outline" onClick={()=>onEdit(d._id)}>✏️ Edit</button>
              <button data-testid="donor-detail-delete-btn" data-id={d._id} className="btn btn-danger" onClick={()=>onDelete(d)}>🗑 Delete</button>
            </>:<span className="lock-badge">🔒 View only — editing requires Admin access</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkUploadModal({ onClose, onDone }) {
  const [step, setStep]   = useState(1);
  const [rows, setRows]   = useState([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult]   = useState(null);
  const { showToast } = useToast();
  const COLS = ['firstName','lastName','phone','bloodType','email','address','city','lastDonationDate','isAvailable'];
  const REQ  = ['firstName','phone','bloodType'];

  function processFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { showToast('Please select an .xlsx or .xls file.','error'); return; }
    setFileName('📁 ' + file.name);
    const reader = new FileReader();
    reader.onload = async e => {
      const { read, utils } = await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs').catch(()=>({read:null,utils:null}));
      if (!read) { showToast('XLSX library unavailable. Run: npm install xlsx','error'); return; }
      try { const wb=read(new Uint8Array(e.target.result),{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]]; setRows(utils.sheet_to_json(ws,{defval:''})); setStep(2); }
      catch(err) { showToast('Failed to parse file: '+err.message,'error'); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function confirm() {
    if (!rows.length) return;
    setUploading(true);
    const res = await apiFetch('/donors/bulk',{method:'POST',body:JSON.stringify({donors:rows})});
    setResult(res); setStep(3); setUploading(false);
  }

  return (
    <div className="modal-overlay open" id="bulk-modal" onClick={onClose}>
      <div className="modal" style={{maxWidth:700}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 id="bulk-modal-title">Bulk Upload Donors</h3><button id="bulk-donor-modal-close-btn" className="modal-close" onClick={onClose}>✕</button></div>
        <div style={{padding:20}}>
          {step===1&&<div id="bulk-step-1">
            <div id="bulk-drop-zone" onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--red)';}} onDragLeave={e=>{e.currentTarget.style.borderColor='var(--border)';}} onDrop={e=>{e.preventDefault();e.currentTarget.style.borderColor='var(--border)';const f=e.dataTransfer.files[0];if(f)processFile(f);}}
              style={{border:'2px dashed var(--border)',borderRadius:12,padding:32,textAlign:'center',background:'var(--bg3)',cursor:'pointer'}}
              onClick={()=>document.getElementById('bulk-file-input').click()}>
              <div style={{fontSize:'2.5rem',marginBottom:8}}>📁</div>
              <p style={{color:'var(--text2)',fontSize:'0.88rem'}}>Drag & drop an .xlsx file here, or <strong style={{color:'var(--red)'}}>click to browse</strong></p>
              <p style={{fontSize:'0.75rem',color:'var(--text3)',marginTop:4}}>Required columns: <code>firstName, phone, bloodType</code></p>
            </div>
            <input type="file" id="bulk-file-input" accept=".xlsx,.xls" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f)processFile(f);}}/>
            <div id="bulk-file-name" style={{marginTop:8,fontSize:'0.82rem',color:'var(--text2)'}}>{fileName}</div>
          </div>}
          {step===2&&<div id="bulk-step-2">
            <p style={{marginBottom:10,fontSize:'0.82rem',color:'var(--text2)'}}><strong>{rows.length} row{rows.length!==1?'s':''} found</strong> — review before uploading:</p>
            <div style={{overflowX:'auto',maxHeight:320,overflowY:'auto',border:'1px solid var(--border)',borderRadius:9}}>
              <table style={{fontSize:'0.78rem',minWidth:600}}>
                <thead><tr>{COLS.map(c=><th key={c} style={{padding:'7px 10px',textAlign:'left',fontFamily:'var(--font-ui)',fontSize:'0.72rem',color:'var(--text2)',background:'var(--bg3)'}}>{c}</th>)}</tr></thead>
                <tbody>{rows.slice(0,50).map((row,i)=>(
                  <tr key={i} style={{background:i%2===0?'':'var(--bg3)'}}>
                    {COLS.map(c=>{const val=row[c]!==undefined?String(row[c]):'';const missing=!val&&REQ.includes(c);return<td key={c} style={{padding:'6px 10px',borderTop:'1px solid var(--border2)',color:missing?'#C8102E':'inherit',fontWeight:missing?700:'inherit'}}>{val||(missing?'⚠ missing':'—')}</td>;})}</tr>
                ))}</tbody>
              </table>
            </div>
          </div>}
          {step===3&&result&&<div id="bulk-step-3" style={{textAlign:'center',padding:'20px 0'}}>
            {result.success?<><div style={{fontSize:'3rem',marginBottom:12}}>✅</div><h4 style={{color:'#15803D'}}>Upload Complete!</h4><p style={{color:'var(--text2)',fontSize:'0.88rem',marginTop:6}}>{result.message||`${result.data?.created||0} donors added.`}</p></>
              :<><div style={{fontSize:'3rem',marginBottom:12}}>❌</div><h4 style={{color:'#DC2626'}}>Upload Failed</h4><p style={{color:'var(--text2)',fontSize:'0.88rem',marginTop:6}}>{result.error||'Something went wrong.'}</p></>}
          </div>}
        </div>
        <div className="modal-footer">
          {step<3&&<button className="btn btn-outline" id="bulk-cancel-btn" onClick={onClose}>Cancel</button>}
          {step===2&&<button className="btn btn-primary" id="bulk-confirm-btn" onClick={confirm} disabled={uploading}>{uploading?'⏳ Uploading…':'⬆️ Confirm Upload'}</button>}
          {step===3&&<button className="btn btn-primary" id="bulk-done-btn" onClick={result?.success?onDone:onClose} style={{display:''}}>{result?.success?'✅ Done':'Close'}</button>}
        </div>
      </div>
    </div>
  );
}

function DonorBulkModal({ onClose, onDone }) {
  const config = {
    title: 'Bulk Donor Upload',
    dataKey: 'donors',
    endpoint: '/donors/bulk',
    uploadLabel: 'Upload Donors',
    dropIcon: '📊',
    cols: ['firstName','lastName','phone','bloodType','email','address','city','lastDonationDate','isAvailable'],
    required: ['firstName','phone','bloodType'],
    colInfo: [
      {key:'firstName',note:'required'},{key:'lastName',note:'optional'},
      {key:'phone',note:'required'},{key:'bloodType',note:'A+, B-, O+, etc.'},
      {key:'email',note:'optional'},{key:'address',note:'optional'},
      {key:'lastDonationDate',note:'optional (YYYY-MM-DD)'},{key:'isAvailable',note:'true / false'},
    ],
    errorRowKey: 'email',
    errorRowLabel: 'Email',
    warnNote: 'Rows with invalid data or duplicate emails will be skipped during upload.',
    templateFn: ({ utils, writeFile }) => {
      const headers   = ['firstName','lastName','phone','bloodType','email','address','city','lastDonationDate','isAvailable'];
      const sampleRow = ['Arjun','Kumar','9876543210','O+','arjun@example.com','12 Anna Nagar, Chennai','Chennai','2024-01-15','true'];
      const wb = utils.book_new();
      const ws = utils.aoa_to_sheet([headers, sampleRow]);
      ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
      utils.book_append_sheet(wb, ws, 'Donors');
      writeFile(wb, 'HSBlood_Donor_Template.xlsx');
    },
  };
  return <BulkModal config={config} onClose={onClose} onDone={onDone}/>;
}
