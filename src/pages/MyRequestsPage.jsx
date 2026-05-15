import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import { useAuth } from '../context/AuthContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ReqFormModal from './ReqFormModalStandalone.jsx';

const URGENCY_ICON = {Critical:'🔴',High:'🟠',Medium:'🟡',Low:'🟢'};

export default function MyRequestsPage() {
  const { showToast } = useToast();
  const { user, isAdmin } = useAuth();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusPopup, setStatusPopup] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/my-requirements');
    if (res.success) setItems(res.data);
    else showToast(res.error || 'Failed to load.', 'error');
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('requirement:updated', load);

  const total    = items.length;
  const open     = items.filter(r => r.status === 'Open').length;
  const fulfilled= items.filter(r => r.status === 'Fulfilled').length;
  const partial  = items.filter(r => r.status === 'Open' && (r.donationsCount||0) > 0).length;

  function label(r) {
    const donated = r.donationsCount || 0;
    if (r.status === 'Fulfilled') return { text: 'Fulfilled',           cls: 'status-fulfilled' };
    if (r.status === 'Cancelled') return { text: 'Cancelled',           cls: 'status-cancelled' };
    if (donated === 0)            return { text: 'Pending',             cls: 'status-pending'   };
    return                               { text: 'Partially Fulfilled', cls: 'status-partial'   };
  }

  return (
    <div id="page-my-requests" className="page">
      <div className="page-header-row page-header">
        <div><h2 className="page-title">📋 My Requests</h2><p className="page-sub">Blood requirements you have created</p></div>
        <button id="my-req-add-btn" className="btn btn-primary" onClick={()=>setFormOpen(true)} type="button">➕ New Requirement</button>
      </div>

      {/* Stats */}
      <div id="my-req-stats" className="dash-stats" style={{marginBottom:18}}>
        <div className="dash-stat highlight"><div className="label">My Requests</div><div className="value">{loading?'…':total}</div><div className="sub">All time</div></div>
        <div className="dash-stat"><div className="label" style={{color:'#2563EB'}}>Open</div><div className="value" style={{color:'#2563EB'}}>{loading?'…':open}</div><div className="sub">Active</div></div>
        <div className="dash-stat"><div className="label" style={{color:'#D97706'}}>Partially Met</div><div className="value" style={{color:'#D97706'}}>{loading?'…':partial}</div><div className="sub">In progress</div></div>
        <div className="dash-stat"><div className="label" style={{color:'#15803D'}}>Fulfilled</div><div className="value" style={{color:'#15803D'}}>{loading?'…':fulfilled}</div><div className="sub">Completed</div></div>
      </div>

      <div id="my-req-view">
        {loading ? <div className="spinner"/> : items.length === 0 ? (
          <div className="empty-state"><div className="emoji">📋</div><h4>No requests yet</h4><p>You haven't created any blood requirements.</p></div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Patient</th><th>Hospital</th><th>Blood</th><th>Units</th><th>Progress</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map(r => {
                const completed = r.donationsCount || 0;
                const pending   = r.pendingCount   || 0;
                const total2    = r.unitsRequired;
                const remaining = r.remainingUnits != null ? r.remainingUnits : total2;
                const pct       = total2 > 0 ? Math.round((completed/total2)*100) : 0;
                const { text, cls } = label(r);
                return (
                  <tr key={r._id}>
                    <td className="bold">{r.patientName}</td>
                    <td>{r.hospital}</td>
                    <td><span className="blood-badge">{r.bloodType}</span></td>
                    <td style={{fontWeight:700,fontFamily:'var(--font-ui)'}}>
                      {completed}/{total2}
                      {pending > 0 && <div style={{fontSize:'0.68rem',color:'#92400E',fontWeight:600}}>+{pending} pending</div>}
                    </td>
                    <td style={{minWidth:110}}>
                      <div className="prog-wrap"><div className="prog-bar" style={{width:`${pct}%`}}/></div>
                      <div style={{fontSize:'0.68rem',color:'var(--text3)',marginTop:2,fontFamily:'var(--font-ui)'}}>{remaining} remaining</div>
                    </td>
                    <td><span className={`fulfill-badge ${cls}`}>{text}</span></td>
                    <td style={{fontSize:'0.78rem',color:'var(--text2)'}}>{formatDate(r.createdAt)}</td>
                    <td>
                      <div style={{display:'flex',gap:5}}>
                        {r.status === 'Open'
                          ? <button className="btn btn-outline btn-sm" onClick={()=>setStatusPopup(r._id)}>📊 Status</button>
                          : <button className="btn btn-outline btn-sm" onClick={()=>setStatusPopup(r._id)}>👁</button>}
                        <button className="btn btn-outline btn-sm" onClick={()=>window.location.href=`/requirements?action=edit&id=${r._id}`}>✏️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {formOpen && <ReqFormModal onClose={()=>setFormOpen(false)} onSaved={()=>{setFormOpen(false);load();}} />}
      {statusPopup && <StatusPopup reqId={statusPopup} user={user} isAdmin={isAdmin} onClose={()=>setStatusPopup(null)} onReload={load}/>}
    </div>
  );
}

function StatusPopup({ reqId, user, isAdmin, onClose, onReload }) {
  const { showToast } = useToast();
  const [r, setR]       = useState(null);
  const [donors, setDonors] = useState([]);

  const reload = useCallback(async () => {
    const res = await apiFetch('/requirements/' + reqId);
    if (res.success) {
      setR(res.data);
      const isReq = res.data?.createdBy === user?.username || isAdmin;
      if (isReq) {
        const dRes = await apiFetch('/requirements/' + reqId + '/donors');
        if (dRes.success) setDonors(dRes.data);
      }
    }
  }, [reqId, user, isAdmin]);
  useEffect(() => { reload(); }, [reload]);

  async function updateDonorStatus(donorUsername, donationStatus) {
    const res = await apiFetch('/requirements/'+reqId+'/donations/'+encodeURIComponent(donorUsername)+'/status', { method:'POST', body: JSON.stringify({ donationStatus }) });
    if (res.success) { showToast(donationStatus === 'Completed' ? '✅ Marked as Completed!' : 'Set back to Pending.', 'success'); reload(); onReload(); }
    else showToast(res.error || 'Could not update status.', 'error');
  }

  if (!r) return <div className="modal-overlay open"><div className="modal"><div className="spinner" style={{margin:40}}/></div></div>;

  const completed = (r.donations||[]).filter(d=>d.donationStatus==='Completed').length;
  const pending   = (r.donations||[]).filter(d=>(d.donationStatus||'Pending')==='Pending').length;
  const total     = r.unitsRequired;
  const remaining = r.remainingUnits != null ? r.remainingUnits : total;
  const pct       = total > 0 ? Math.round((completed/total)*100) : 0;

  return (
    <div className="modal-overlay open" id="status-popup-modal" onClick={onClose}>
      <div className="modal" style={{maxWidth:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>📊 Request Status</h3><button className="modal-close" onClick={onClose}>✕</button></div>
        <div id="status-popup-content" style={{padding:20}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20}}>
            <div>
              <h3 style={{fontFamily:'var(--font-display)',fontSize:'1.2rem',color:'var(--text)',marginBottom:3}}>{r.patientName}</h3>
              <p style={{fontSize:'0.8rem',color:'var(--text2)'}}>🏥 {r.hospital}{r.location?' · 📍 '+r.location:''}</p>
            </div>
            <span className="blood-badge" style={{fontSize:'1rem',padding:'4px 12px'}}>{r.bloodType}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:20}}>
            {[['Required',total,'var(--red)'],['Completed',completed,'#15803D'],['Remaining',remaining,'#D97706']].map(([l,v,c])=>(
              <div key={l} className="status-stat-card"><div className="status-stat-val" style={{color:c}}>{v}</div><div className="status-stat-label">{l}</div></div>
            ))}
          </div>
          {pending > 0 && r.status !== 'Fulfilled' && <div style={{fontSize:'0.75rem',color:'#92400E',background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:8,padding:'6px 12px',marginBottom:12}}>⏳ {pending} donor{pending>1?'s':''} scheduled — awaiting confirmation</div>}
          <div style={{marginBottom:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:'0.78rem',fontWeight:600,color:'var(--text2)'}}>Fulfillment Progress</span>
              <span style={{fontSize:'0.78rem',fontWeight:700,color:'var(--text)',fontFamily:'var(--font-ui)'}}>{pct}%</span>
            </div>
            <div style={{height:10,background:'var(--border)',borderRadius:99,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:pct===100?'#15803D':'var(--red)',borderRadius:99,transition:'width 0.6s ease'}}/>
            </div>
          </div>
          {donors.length > 0 && (
            <div style={{marginTop:18}}>
              <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text2)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.06em'}}>Donors Who Responded</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {donors.map(d => {
                  const isPending = (d.donationStatus||'Pending') === 'Pending';
                  return (
                    <div key={d.donorUsername} data-donor-card={d.donorUsername} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'var(--surface)',borderRadius:10,border:`1.5px solid ${isPending?'#FCD34D':'#86EFAC'}`}}>
                      <div style={{width:34,height:34,borderRadius:9,background:'var(--red-light)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:'var(--red)',fontSize:'0.82rem',fontFamily:'var(--font-ui)',flexShrink:0}}>{(d.donorName||d.donorUsername||'?')[0].toUpperCase()}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'0.84rem',fontWeight:600,color:'var(--text)'}}>{d.donorName||d.donorUsername}</div>
                        <div style={{fontSize:'0.72rem',color:'var(--text3)'}}>@{d.donorUsername}</div>
                        {d.scheduledDate && <div style={{fontSize:'0.72rem',color:'#2563EB',marginTop:3,fontWeight:500}}>📅 {formatDate(d.scheduledDate)}{d.scheduledTime?' · 🕐 '+d.scheduledTime:''}</div>}
                      </div>
                      <select value={d.donationStatus||'Pending'} onChange={e=>updateDonorStatus(d.donorUsername,e.target.value)}
                        style={{background:isPending?'#FEF3C7':'#DCFCE7',color:isPending?'#92400E':'#15803D',border:`1.5px solid ${isPending?'#FCD34D':'#86EFAC'}`,fontSize:'0.73rem',fontWeight:700,fontFamily:'var(--font-ui)',padding:'5px 10px',borderRadius:8,cursor:'pointer',minWidth:122}}>
                        <option value="Pending">⏳ Pending</option>
                        <option value="Completed">✅ Completed</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer"><button className="btn btn-outline" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
