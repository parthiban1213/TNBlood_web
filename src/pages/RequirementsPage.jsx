import { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import BulkModal from '../components/BulkModal.jsx';

const BT = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const URGENCY_ICON = {Critical:'🔴',High:'🟠',Medium:'🟡',Low:'🟢'};
const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

export default function RequirementsPage() {
  const { isAdmin, user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [all, setAll]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [fBlood, setFBlood]     = useState('');
  const [fStatus, setFStatus]   = useState('');
  const [fUrgency, setFUrgency] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [viewId, setViewId]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkOpen, setBulkOpen]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/requirements');
    if (res.success) setAll(res.data);
    else document.getElementById('req-view').innerHTML=`<div class="empty-state"><div class="emoji">⚠️</div><h4>Failed to load requirements</h4><p>${res.error||'Could not connect.'}</p><button class="btn btn-outline" style="margin-top:12px" onclick="window.location.reload()">↻ Retry</button></div>`;
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // sidebar action params
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('action')==='add') { setEditId(null); setFormOpen(true); navigate('/requirements',{replace:true}); }
    if (p.get('action')==='edit' && p.get('id')) { setEditId(p.get('id')); setFormOpen(true); navigate('/requirements',{replace:true}); }
  }, [location.search]);

  useSocketEvent('requirement:created', r => setAll(p=>[r,...p]));
  useSocketEvent('requirement:updated', r => setAll(p=>p.map(x=>x._id===r._id?r:x)));
  useSocketEvent('requirement:deleted', ({id}) => setAll(p=>p.filter(x=>x._id!==id)));

  const q = search.toLowerCase();
  const filtered = all.filter(r => {
    if (fBlood  && r.bloodType !== fBlood)   return false;
    if (fStatus && r.status   !== fStatus)   return false;
    if (fUrgency&& r.urgency  !== fUrgency)  return false;
    if (q && !(r.patientName.toLowerCase().includes(q)||r.hospital.toLowerCase().includes(q)||(r.contactPerson||'').toLowerCase().includes(q))) return false;
    return true;
  });

  const open      = all.filter(r=>r.status==='Open').length;
  const critical  = all.filter(r=>r.urgency==='Critical'&&r.status==='Open').length;
  const fulfilled = all.filter(r=>r.status==='Fulfilled').length;
  const total     = all.length;

  async function quickUpdateStatus(id, selectEl) {
    const newStatus = selectEl.value;
    selectEl.className = 'req-status-select s-' + newStatus;
    const res = await apiFetch('/requirements/'+id,{method:'PUT',body:JSON.stringify({status:newStatus})});
    if (res.success) { showToast('Status updated to '+newStatus+'!','success'); setAll(p=>p.map(r=>r._id===id?{...r,status:newStatus}:r)); }
    else { showToast(res.error||'Could not update status.','error'); const r=all.find(x=>x._id===id); if(r){selectEl.value=r.status;selectEl.className='req-status-select s-'+r.status;} }
  }

  async function doDelete() {
    const res = await apiFetch('/requirements/'+deleteTarget._id,{method:'DELETE'});
    if (res.success) { setAll(p=>p.filter(x=>x._id!==deleteTarget._id)); showToast(res.message||'Deleted.'); setDeleteTarget(null); }
    else showToast(res.error||'Failed to delete.','error');
  }

  return (
    <div id="page-requirements" className="page">
      <div className="page-header-row page-header">
        <div><h2>Blood <span>Requirements</span></h2><p>Track and manage urgent blood requirement requests</p></div>
        <div id="req-admin-btn">
          {isAdmin && <button className="btn btn-primary" onClick={()=>{setEditId(null);setFormOpen(true);}}>➕ Add Requirement</button>}
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-bar">
          <span style={{color:'var(--text3)'}}>🔍</span>
          <input type="text" id="req-search" placeholder="Search by patient, hospital…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <select className="filter-select" id="req-filter-blood" value={fBlood} onChange={e=>setFBlood(e.target.value)}>
          <option value="">All Blood Types</option>{BT.map(b=><option key={b}>{b}</option>)}
        </select>
        <select className="filter-select" id="req-filter-status" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="Open">Open</option><option value="Fulfilled">Fulfilled</option><option value="Cancelled">Cancelled</option>
        </select>
        <select className="filter-select" id="req-filter-urgency" value={fUrgency} onChange={e=>setFUrgency(e.target.value)}>
          <option value="">All Urgency</option>
          <option value="Critical">🔴 Critical</option><option value="High">🟠 High</option><option value="Medium">🟡 Medium</option><option value="Low">🟢 Low</option>
        </select>
      </div>

      {/* Stats */}
      <div id="req-summary-stats" data-testid="req-summary-stats" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:15}}>
        {loading?null:<>
          <div className="dash-stat highlight"><div className="label">Open</div><div className="value">{open}</div><div className="sub">Active requests</div></div>
          <div className="dash-stat"><div className="label" style={{color:'#DC2626'}}>Critical</div><div className="value" style={{color:'#DC2626'}}>{critical}</div><div className="sub">Needs immediate action</div></div>
          <div className="dash-stat"><div className="label">Fulfilled</div><div className="value">{fulfilled}</div><div className="sub">Completed</div></div>
          <div className="dash-stat"><div className="label">Total</div><div className="value">{total}</div><div className="sub">All time</div></div>
        </>}
      </div>

      {/* Table */}
      <div className="card">
        <div id="req-view" data-testid="req-view">
          {loading ? <div className="spinner"/> : filtered.length === 0 ? (
            <div className="empty-state"><div className="emoji">📋</div><h4>No requirements found</h4><p>No blood requirements match your filters.</p></div>
          ) : (
            <div className="table-wrap"><table>
              <thead><tr><th>Patient</th><th>Hospital</th><th>Blood Type</th><th>Units</th><th>Progress</th><th>Urgency</th><th>Required By</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(r => {
                  const donated   = (r.donations||[]).length;
                  const total2    = r.unitsRequired;
                  const remaining = r.remainingUnits!=null?r.remainingUnits:total2;
                  const pct       = total2>0?Math.round((donated/total2)*100):0;
                  const canEdit   = isAdmin||r.createdBy===user?.username;
                  const hasStatus = r.status==='Open';
                  return (
                    <tr key={r._id} data-testid="req-row" data-id={r._id}>
                      <td className="bold">{r.patientName}</td>
                      <td>{r.hospital}</td>
                      <td><span className="blood-badge">{r.bloodType}</span></td>
                      <td style={{fontFamily:'var(--font-ui)',fontWeight:700,color:'var(--text)'}}>{total2}</td>
                      <td style={{minWidth:100}}>
                        <div className="prog-wrap"><div className="prog-bar" style={{width:`${pct}%`}}/></div>
                        <div style={{fontSize:'0.66rem',color:'var(--text3)',marginTop:2,fontFamily:'var(--font-ui)'}}>{donated}/{total2} donated</div>
                      </td>
                      <td><span className={`urgency-badge urgency-${r.urgency}`}>{URGENCY_ICON[r.urgency]} {r.urgency}</span></td>
                      <td>{formatDate(r.requiredBy)}</td>
                      <td>
                        {isAdmin
                          ? <select data-testid="req-status-select" data-id={r._id} className={`req-status-select s-${r.status}`} defaultValue={r.status} onChange={e=>quickUpdateStatus(r._id,e.target)}>{['Open','Fulfilled','Cancelled'].map(s=><option key={s} value={s}>{s}</option>)}</select>
                          : <span className={`req-status-badge req-status-${r.status}`}>{r.status}</span>}
                      </td>
                      <td><div style={{display:'flex',gap:5,alignItems:'center'}}>
                        {hasStatus && <button className="btn btn-outline btn-sm" onClick={()=>setViewId(r._id)} title="View status">📊</button>}
                        <button data-testid="req-view-btn" className="btn btn-outline btn-sm" onClick={()=>setViewId(r._id)} title="View details">👁</button>
                        {canEdit && <button data-testid="req-edit-btn" className="btn btn-outline btn-sm" onClick={()=>{setEditId(r._id);setFormOpen(true);}}>✏️</button>}
                        {isAdmin  && <button data-testid="req-delete-btn" className="btn btn-danger btn-sm" onClick={()=>setDeleteTarget(r)}>🗑</button>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {bulkOpen && isAdmin && <ReqBulkModal onClose={()=>setBulkOpen(false)} onDone={()=>{load();showToast('Bulk upload complete!');}}/>}
      {formOpen  && <ReqFormModal reqId={editId} onClose={()=>setFormOpen(false)} onSaved={r=>{if(editId)setAll(p=>p.map(x=>x._id===r._id?r:x));else setAll(p=>[r,...p]);setFormOpen(false);showToast('Saved!');load();}} isAdmin={isAdmin} user={user}/>}
      {viewId    && <ReqDetailModal reqId={viewId} onClose={()=>setViewId(null)} isAdmin={isAdmin} user={user} onStatusChange={quickUpdateStatus} onEdit={id=>{setViewId(null);setEditId(id);setFormOpen(true);}} onDelete={r=>{setViewId(null);setDeleteTarget(r);}} allReqs={all}/>}
      {deleteTarget && <ConfirmModal title="Delete Requirement" body={`Delete blood requirement for "${deleteTarget.patientName}"? This cannot be undone.`} confirmLabel="Delete" danger onConfirm={doDelete} onCancel={()=>setDeleteTarget(null)}/>}
    </div>
  );
}

function ReqFormModal({ reqId, onClose, onSaved, isAdmin, user }) {
  const [f, setF]       = useState({patientName:'',hospital:'',location:'',contactPerson:'',contactPhone:'',bloodType:'',acceptAnyBloodType:false,unitsRequired:1,urgency:'Critical',requiredBy:'',status:'Open',notes:''});
  const [loading, setLoading] = useState(!!reqId);
  const [saving, setSaving]   = useState(false);
  const [dupWarn, setDupWarn] = useState('');
  const up = (k,v) => setF(p=>({...p,[k]:v}));

  useEffect(() => {
    if (!reqId) return;
    apiFetch('/requirements/'+reqId).then(res => {
      if (res.success) { const r=res.data; setF({patientName:r.patientName||'',hospital:r.hospital||'',location:r.location||'',contactPerson:r.contactPerson||'',contactPhone:r.contactPhone||'',bloodType:r.bloodType||'',acceptAnyBloodType:!!r.acceptAnyBloodType,unitsRequired:r.unitsRequired||1,urgency:r.urgency||'Critical',requiredBy:r.requiredBy?r.requiredBy.split('T')[0]:'',status:r.status||'Open',notes:r.notes||''}); }
      setLoading(false);
    });
  }, [reqId]);

  function setAcceptAny(val) {
    up('acceptAnyBloodType', val);
    const sel = document.getElementById('req-bloodType');
    if (sel) { sel.style.opacity = val ? '0.5' : ''; if (val) sel.removeAttribute('required'); else sel.setAttribute('required','required'); }
  }

  async function save(e) {
    if (e) e.preventDefault();
    setDupWarn('');
    const btn = document.getElementById('save-req-btn');
    if (btn) { btn.disabled=true; btn.textContent='Saving…'; }
    setSaving(true);
    const body = {...f, unitsRequired:parseInt(f.unitsRequired,10)};
    if (!reqId) body.remainingUnits = body.unitsRequired;
    const res = reqId ? await apiFetch('/requirements/'+reqId,{method:'PUT',body:JSON.stringify(body)}) : await apiFetch('/requirements',{method:'POST',body:JSON.stringify(body)});
    if (res.success) { setDupWarn(''); onSaved(res.data); }
    else { if (res.status===409||res.error?.toLowerCase().includes('already exists')) setDupWarn(res.error||'A requirement with this information already exists.'); }
    if (btn) { btn.disabled=false; btn.textContent='💾 Save Requirement'; }
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" id="req-modal" onClick={onClose}>
      <div className="modal" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 id="req-modal-title">{reqId?'Edit Blood Requirement':'New Blood Requirement'}</h3><button id="req-modal-close-btn" className="modal-close" onClick={onClose}>✕</button></div>
        <form id="req-form" data-testid="req-form" onSubmit={save}>
          <input type="hidden" id="req-id" value={reqId||''}/>
          {dupWarn && <div id="req-dup-warn" style={{background:'#FFF7ED',border:'1.5px solid #FED7AA',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:'0.82rem',color:'#92400E',fontFamily:'var(--font-ui)'}}><strong>⚠️ Duplicate Detected</strong><br/><span id="req-dup-msg">{dupWarn}</span></div>}
          {loading ? <div className="spinner"/> : (<>
            <div id="req-section-patient" className="section-divider">Patient & Hospital</div>
            <div className="form-grid">
              <div className="form-group"><label>Patient Name *</label><input type="text" id="req-patientName" required placeholder="e.g. Ravi Kumar" style={IS} value={f.patientName} onChange={e=>up('patientName',e.target.value)} onBlur={()=>checkReqDup(f,setDupWarn,reqId)}/></div>
              <div className="form-group"><label>Hospital / Centre *</label><input type="text" id="req-hospital" required placeholder="e.g. PSG Hospital" style={IS} value={f.hospital} onChange={e=>up('hospital',e.target.value)} onBlur={()=>checkReqDup(f,setDupWarn,reqId)}/></div>
              <div className="form-group"><label>Location</label><input type="text" id="req-location" placeholder="e.g. Coimbatore, Tamil Nadu" style={IS} value={f.location} onChange={e=>up('location',e.target.value)}/></div>
              <div className="form-group"><label>Contact Person *</label><input type="text" id="req-contactPerson" required placeholder="Name of coordinator" style={IS} value={f.contactPerson} onChange={e=>up('contactPerson',e.target.value)}/></div>
              <div className="form-group"><label>Contact Phone *</label><input type="tel" id="req-contactPhone" required placeholder="+91 98765 43210" style={IS} value={f.contactPhone} onChange={e=>up('contactPhone',e.target.value)}/></div>
            </div>
            <div id="req-section-blood" className="section-divider">Blood Details</div>
            <div className="form-grid">
              <div className="form-group">
                <label>Blood Type Required *</label>
                <select id="req-bloodType" required={!f.acceptAnyBloodType} style={{...IS,cursor:'pointer',opacity:f.acceptAnyBloodType?0.5:1}} value={f.bloodType} onChange={e=>{up('bloodType',e.target.value);}} onBlur={()=>checkReqDup(f,setDupWarn,reqId)} disabled={f.acceptAnyBloodType}>
                  <option value="">Select blood type</option>{BT.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label id="req-accept-any-label" className={`accept-any-checkbox${f.acceptAnyBloodType?' active':''}`} onClick={()=>setAcceptAny(!f.acceptAnyBloodType)} style={{cursor:'pointer'}}>
                  <span className="accept-any-check-wrap">
                    <input type="checkbox" id="req-acceptAnyBloodType" checked={f.acceptAnyBloodType} onChange={()=>{}} tabIndex={-1} style={{position:'absolute',opacity:0,pointerEvents:'none'}}/>
                    <span className="accept-any-check-box" id="req-acceptAny-box"/>
                  </span>
                  <span className="accept-any-text">
                    <span className="accept-any-title">Accept any blood type</span>
                    <span className="accept-any-sub">Any donor can volunteer, regardless of blood type</span>
                  </span>
                </label>
              </div>
              <div className="form-group"><label>Units Required *</label><input type="number" id="req-units" required min={1} placeholder="e.g. 2" style={IS} value={f.unitsRequired} onChange={e=>up('unitsRequired',e.target.value)}/></div>
              <input type="hidden" id="req-urgency" value={f.urgency}/>
              <div className="form-group"><label>Required By Date</label><input type="date" id="req-requiredBy" style={IS} value={f.requiredBy} onChange={e=>up('requiredBy',e.target.value)}/></div>
              {reqId && <div className="form-group" id="req-status-group"><label>Status</label>
                <select id="req-status" style={{...IS,cursor:'pointer'}} value={f.status} onChange={e=>up('status',e.target.value)}>
                  {['Open','Fulfilled','Cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>}
              <div className="form-group full"><label>Additional Notes</label><textarea id="req-notes" placeholder="Any special instructions or context…" style={{...IS,height:70,resize:'vertical'}} value={f.notes} onChange={e=>up('notes',e.target.value)}/></div>
            </div>
          </>)}
        </form>
        <div className="modal-footer">
          <button id="req-modal-cancel-btn" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} id="save-req-btn" type="button">💾 Save Requirement</button>
        </div>
      </div>
    </div>
  );
}

function ReqDetailModal({ reqId, onClose, isAdmin, user, onStatusChange, onEdit, onDelete, allReqs }) {
  const [r, setR]       = useState(null);
  const [donors, setDonors] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch('/requirements/'+reqId).then(res=>{if(res.success)setR(res.data);});
    if (isAdmin) apiFetch('/requirements/'+reqId+'/donors').then(res=>{if(res.success)setDonors(res.data);});
  }, [reqId, isAdmin]);

  if (!r) return <div className="modal-overlay open" id="req-detail-modal"><div className="modal"><div className="spinner" style={{margin:40}}/></div></div>;

  const completed = (r.donations||[]).filter(d=>d.donationStatus==='Completed').length;
  const total     = r.unitsRequired;
  const remaining = r.remainingUnits!=null?r.remainingUnits:total;
  const pct       = total>0?Math.round((completed/total)*100):0;
  const barColor  = pct===100?'#15803D':'var(--red)';
  const canEdit   = isAdmin||r.createdBy===user?.username;

  async function updateStatusFromModal(id, newStatus) {
    const res = await apiFetch('/requirements/'+id,{method:'PUT',body:JSON.stringify({status:newStatus})});
    if (res.success) { showToast('Status updated to '+newStatus+'!','success'); setR(p=>({...p,status:newStatus})); }
    else showToast(res.error||'Could not update status.','error');
  }

  const statusBtns = ['Open','Fulfilled','Cancelled'].map(s => {
    const active = r.status===s;
    const col = active?(s==='Open'?'background:#EFF6FF;color:#2563EB;border:1.5px solid #BFDBFE;':s==='Fulfilled'?'background:#F0FDF4;color:#15803D;border:1.5px solid #BBF7D0;':'background:#F8FAFC;color:#94A3B8;border:1.5px solid #E2E8F0;'):'background:#fff;color:var(--text3);border:1.5px solid var(--border);';
    const icon = s==='Open'?'🔵':s==='Fulfilled'?'✅':'❌';
    return <button key={s} className="btn btn-sm" style={{padding:'3px 10px',fontSize:'0.7rem',...Object.fromEntries(col.split(';').filter(Boolean).map(x=>[x.split(':')[0].trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),x.split(':').slice(1).join(':').trim()]))}} onClick={()=>updateStatusFromModal(r._id,s)} disabled={active}>{icon} {s}</button>;
  });

  return (
    <div className="modal-overlay open" id="req-detail-modal" onClick={onClose}>
      <div className="modal" style={{maxWidth:580}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>Requirement Details</h3><button id="req-detail-modal-close-btn" className="modal-close" onClick={onClose}>✕</button></div>
        <div id="req-detail-content" style={{maxHeight:'70vh',overflowY:'auto',padding:'0 4px'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12,marginBottom:16,padding:16,background:'var(--red-light)',borderRadius:12,border:'1px solid rgba(200,16,46,0.1)'}}>
            <div style={{flex:1}}>
              <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.45rem',color:'var(--text)'}}>{r.patientName}</h2>
              <p style={{color:'var(--text2)',fontSize:'0.82rem',marginTop:3}}>🏥 {r.hospital}</p>
              {r.location && <p style={{color:'var(--text2)',fontSize:'0.82rem',marginTop:2}}>📍 {r.location}</p>}
              <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
                <span className={`urgency-badge urgency-${r.urgency}`}>{URGENCY_ICON[r.urgency]} {r.urgency}</span>
                {isAdmin ? <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{statusBtns}</div> : <span className={`req-status-badge req-status-${r.status}`}>{r.status}</span>}
              </div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontFamily:'var(--font-display)',fontSize:'2.5rem',fontWeight:700,color:'var(--red)',lineHeight:1}}>{r.bloodType}</div>
              {r.acceptAnyBloodType && <div style={{fontFamily:'var(--font-ui)',fontSize:'0.68rem',fontWeight:700,color:'var(--red)',marginTop:4,background:'var(--red-light)',border:'1px solid rgba(200,16,46,.2)',borderRadius:6,padding:'2px 7px'}}>✅ Any type welcome</div>}
              <div style={{fontFamily:'var(--font-ui)',fontSize:'0.75rem',color:'var(--text2)',marginTop:3}}>{r.unitsRequired} unit{r.unitsRequired!==1?'s':''} needed</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
            {[['Required',total,'var(--red)'],['Donated',completed,'#15803D'],['Remaining',remaining,'#D97706']].map(([l,v,c])=>(
              <div key={l} className="status-stat-card"><div className="status-stat-val" style={{color:c}}>{v}</div><div className="status-stat-label">{l}</div></div>
            ))}
          </div>
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.75rem',color:'var(--text3)',marginBottom:5}}><span>Fulfillment progress</span><span style={{fontWeight:700,color:'var(--text)'}}>{pct}%</span></div>
            <div style={{height:9,background:'var(--border)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:barColor,borderRadius:99,transition:'width 0.6s ease'}}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            {[['Contact Person',r.contactPerson],['Phone',r.contactPhone],r.location&&['Location','📍 '+r.location],['Required By',formatDate(r.requiredBy)],['Created By',r.createdBy||'—'],['Created On',formatDate(r.createdAt)],['Last Updated',formatDate(r.updatedAt)]].filter(Boolean).map(([k,v])=>(
              <div key={k} className="detail-field"><div className="dk">{k}</div><div className="dv">{v||'—'}</div></div>
            ))}
            {r.notes && <div className="detail-field" style={{gridColumn:'1/-1'}}><div className="dk">Notes</div><div className="dv">{r.notes}</div></div>}
          </div>
          {isAdmin && donors.length > 0 && (
            <div style={{marginTop:16,borderTop:'1px solid var(--border)',paddingTop:14}}>
              <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text2)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.06em'}}>🩸 Donors Who Responded ({donors.length})</div>
              {donors.map(d=>(
                <div key={d.donorUsername} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 13px',background:'var(--surface)',borderRadius:9,border:'1px solid var(--border)',marginBottom:7}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:32,height:32,borderRadius:9,background:'var(--red-light)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'var(--red)',fontSize:'0.82rem',fontFamily:'var(--font-ui)',flexShrink:0}}>{(d.donorName||d.donorUsername||'?')[0].toUpperCase()}</div>
                    <div><div style={{fontSize:'0.84rem',fontWeight:600,color:'var(--text)'}}>{d.donorName||d.donorUsername}</div><div style={{fontSize:'0.72rem',color:'var(--text3)'}}>@{d.donorUsername}</div></div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <span className="blood-badge" style={{fontSize:'0.68rem'}}>{d.bloodType||'—'}</span>
                    <div style={{fontSize:'0.7rem',color:'var(--text3)',marginTop:3}}>{formatDate(d.donatedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{marginTop:14,display:'flex',gap:8,justifyContent:'flex-end',alignItems:'center',flexWrap:'wrap'}}>
            {canEdit && <button className="btn btn-outline" onClick={()=>onEdit(r._id)}>✏️ Edit</button>}
            {isAdmin  && <button className="btn btn-danger"  onClick={()=>onDelete(r)}>🗑 Delete</button>}
            {!canEdit && <span className="lock-badge">🔒 View only</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Req duplicate check helper ────────────────────────────────
async function checkReqDup(f, setDupWarn, reqId) {
  if (reqId) return; // editing — skip
  const { patientName, hospital, bloodType } = f;
  if (!patientName || !hospital || !bloodType) return;
  const res = await apiFetch('/requirements?status=Open');
  if (!res.success) return;
  const dup = res.data.find(r =>
    r.patientName.toLowerCase() === patientName.toLowerCase() &&
    r.hospital.toLowerCase()    === hospital.toLowerCase()    &&
    r.bloodType                 === bloodType
  );
  if (dup) {
    setDupWarn(`An open requirement already exists for "${dup.patientName}" at "${dup.hospital}" needing ${dup.bloodType} blood (created ${new Date(dup.createdAt).toLocaleDateString()}).`);
  } else {
    setDupWarn('');
  }
}

// ── Bulk requirements upload modal ────────────────────────────
function ReqBulkModal({ onClose, onDone }) {
  const config = {
    title: 'Bulk Blood Requirement Upload',
    dataKey: 'requirements',
    endpoint: '/requirements/bulk',
    uploadLabel: 'Upload Requirements',
    dropIcon: '🩸',
    cols: ['patientName','hospital','location','contactPerson','contactPhone','bloodType','unitsRequired','urgency','requiredBy','status','notes'],
    required: ['patientName','hospital','contactPerson','contactPhone','bloodType','unitsRequired'],
    colInfo: [
      {key:'patientName',note:'required'},{key:'hospital',note:'required'},
      {key:'contactPerson',note:'required'},{key:'contactPhone',note:'required'},
      {key:'bloodType',note:'A+, B-, O+, etc.'},{key:'unitsRequired',note:'number'},
      {key:'urgency',note:'Critical/High/Medium/Low'},{key:'requiredBy',note:'optional date'},
      {key:'location',note:'optional'},{key:'notes',note:'optional'},
      {key:'status',note:'Open/Fulfilled/Cancelled'},
    ],
    errorRowKey: 'patientName',
    errorRowLabel: 'Patient',
    warnNote: 'Rows with missing required fields or duplicate open requirements will be skipped.',
    templateFn: ({ utils, writeFile }) => {
      const cols = ['patientName','hospital','location','contactPerson','contactPhone','bloodType','unitsRequired','urgency','requiredBy','status','notes'];
      const ws = utils.aoa_to_sheet([
        cols,
        ['Ravi Kumar','PSG Hospital','Coimbatore','Dr. Anand','+91 98765 43210','O+',2,'High','','Open',''],
        ['Priya Devi','KMCH','Coimbatore','Nurse Meena','+91 90000 11111','B+',1,'Medium','','Open','Post-surgery'],
      ]);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Requirements');
      writeFile(wb, 'HSBlood_Requirements_Template.xlsx');
    },
  };
  return <BulkModal config={config} onClose={onClose} onDone={onDone}/>;
}