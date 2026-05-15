import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ReqDetailModal from './ReqDetailModalView.jsx';

const URGENCY_ICON = {Critical:'🔴',High:'🟠',Medium:'🟡',Low:'🟢'};

export default function RespondPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [donateModal, setDonateModal] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [viewId, setViewId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await apiFetch('/auth/profile');
      if (profileRes.success) updateUser(profileRes.user);
    } catch(e) {}
    const res = await apiFetch('/requirements?status=Open');
    if (res.success) setItems(res.data);
    else showToast(res.error || 'Failed to load.', 'error');
    setLoading(false);
  }, [showToast, updateUser]);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('requirement:created', r => setItems(p => r.status==='Open'?[r,...p]:p));
  useSocketEvent('requirement:updated', r => setItems(p => r.status!=='Open'?p.filter(x=>x._id!==r._id):p.map(x=>x._id===r._id?r:x)));

  const userBT        = user?.bloodType || '';
  const _lastDon      = user?.lastDonationDate ? new Date(user.lastDonationDate) : null;
  // Guard against future lastDonationDate (bad data) — treat as today if date is in the future
  const _lastDonSafe  = _lastDon && _lastDon.getTime() > Date.now() ? new Date() : _lastDon;
  const _daysSince    = _lastDonSafe ? Math.floor((Date.now()-_lastDonSafe.getTime())/86400000) : 999;
  const isNotEligible = _daysSince < 90;
  const _nextEligible = _lastDonSafe ? new Date(_lastDonSafe.getTime()+90*86400000) : null;
  const _daysLeft     = isNotEligible ? Math.max(0, 90-_daysSince) : 0;
  const isUnavailable = user?.isAvailable === false;

  async function respondToDonate(schedDate, schedTime) {
    const res = await apiFetch('/requirements/'+donateModal.id+'/donate', { method:'POST', body:JSON.stringify({ scheduledDate:schedDate||undefined, scheduledTime:schedTime||undefined, donationStatus:'Pending' }) });
    if (res.success) { showToast('✅ Donation scheduled! The requester has been notified.', 'success'); load(); }
    else showToast(res.error || 'Could not record donation.', 'error');
    setDonateModal(null);
  }

  async function respondToDecline(id) {
    const res = await apiFetch('/requirements/'+id+'/decline', { method:'POST', body:JSON.stringify({}) });
    if (res.success) { showToast('Response recorded.', 'success'); load(); }
    else showToast(res.error || 'Could not record response.', 'error');
  }

  async function cancelPledge() {
    const res = await apiFetch('/requirements/'+cancelTarget+'/donate', { method:'DELETE' });
    if (res.success) { showToast('Pledge cancelled successfully.', 'success'); load(); }
    else showToast(res.error || 'Could not cancel pledge.', 'error');
    setCancelTarget(null);
  }

  return (
    <div id="page-respond" className="page">
      <div className="page-header-row page-header">
        <div><h2 className="page-title">🩸 Respond to Requests</h2><p className="page-sub">Open blood requirements matching your blood group</p></div>
        <button className="btn btn-outline" onClick={load} type="button">↻ Refresh</button>
      </div>

      <div id="respond-req-view">
        {loading ? <div className="spinner"/> : (() => {
          if (!items.length) return <div className="empty-state"><div className="emoji">🩸</div><h4>No open requests</h4><p>There are no open blood requirements at the moment.</p></div>;
          return (<>
            {isUnavailable && <div className="warn-banner">⚠️ You are currently marked as <strong>Unavailable</strong> to donate. <a href="#" onClick={e=>{e.preventDefault();navigate('/profile');}}>Update in Profile →</a></div>}
            {isNotEligible && _nextEligible && <div className="warn-banner" style={{background:'#FEF3C7',border:'1.5px solid #FCD34D',color:'#92400E',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:'0.82rem',fontFamily:'var(--font-ui)'}}>⏳ You are not eligible to donate yet. Next eligible date: <strong>{_nextEligible.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</strong> — {_daysLeft} day{_daysLeft!==1?'s':''} remaining.</div>}
            {userBT ? <div style={{fontSize:'0.8rem',color:'var(--text2)',marginBottom:12}}>Showing all requests — <strong>I'll Donate</strong> and <strong>Decline</strong> buttons appear on requests matching your blood type (<span style={{color:'var(--red)',fontWeight:700}}>{userBT}</span>).</div>
                    : <div style={{fontSize:'0.8rem',color:'var(--text3)',marginBottom:12}}>Set your blood type in Profile to enable donating to matching requests.</div>}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
              {items.map(r => {
                const completed     = (r.donations||[]).filter(d=>d.donationStatus==='Completed').length;
                const remaining     = r.remainingUnits!=null?r.remainingUnits:r.unitsRequired;
                const pct           = r.unitsRequired>0?Math.round((completed/r.unitsRequired)*100):0;
                const myDon         = (r.donations||[]).find(d=>d.donorUsername===user?.username);
                const donated       = !!myDon;
                const doneDone      = myDon?.donationStatus==='Completed';
                const declined      = (r.declines||[]).some(d=>d.donorUsername===user?.username);
                const isMatch       = userBT&&(r.bloodType===userBT||r.acceptAnyBloodType);
                let footer = null;
                if (isMatch) {
                  if (donated) footer = doneDone
                    ? <span className="respond-done-badge" style={{background:'#DCFCE7',color:'#15803D',border:'1.5px solid #86EFAC'}}>✅ You donated</span>
                    : <><span className="respond-done-badge" style={{background:'#FEF3C7',color:'#92400E',border:'1.5px solid #FCD34D'}}>⏳ Scheduled</span>
                       <button className="btn btn-sm" onClick={()=>setCancelTarget(r._id)} style={{background:'#FFF1F2',color:'#BE123C',border:'1.5px solid #FECDD3',fontSize:'0.75rem',fontWeight:600,padding:'5px 11px',borderRadius:8,cursor:'pointer',fontFamily:'var(--font-ui)'}}>✕ Cancel</button></>;
                  else if (declined) footer = <span className="respond-declined-badge">❌ Declined</span>;
                  else if (isNotEligible) footer = <button className="btn btn-sm" style={{background:'#F3F4F6',color:'#9CA3AF',border:'1.5px solid #E5E7EB',cursor:'not-allowed',fontFamily:'var(--font-ui)',fontSize:'0.78rem',fontWeight:600,padding:'6px 14px',borderRadius:8,pointerEvents:'none'}} disabled>🚫 Not Eligible</button>;
                  else if (isUnavailable) footer = <span style={{fontSize:'0.72rem',color:'var(--text3)'}}>Update availability to respond</span>;
                  else footer = <>
                    <button className="btn btn-primary btn-sm" onClick={()=>setDonateModal({id:r._id,patientName:r.patientName,bloodType:r.bloodType})}>🩸 I'll Donate</button>
                    <button className="btn btn-outline btn-sm" onClick={()=>respondToDecline(r._id)}>Decline</button>
                  </>;
                }
                return (
                  <div key={r._id} className={`respond-card${isMatch?' respond-card-match':''}`}>
                    <div className="respond-card-top">
                      <div>
                        <div className="respond-card-patient">{r.patientName}</div>
                        <div className="respond-card-hospital">🏥 {r.hospital}</div>
                        {r.location && <div className="respond-card-loc">📍 {r.location}</div>}
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:'var(--font-display)',fontSize:'1.8rem',fontWeight:700,color:'var(--red)',lineHeight:1}}>{r.bloodType}</div>
                        <span className={`urgency-badge urgency-${r.urgency}`} style={{fontSize:'0.65rem',marginTop:4,display:'inline-block'}}>{URGENCY_ICON[r.urgency]} {r.urgency}</span>
                        {isMatch && <div style={{fontSize:'0.65rem',fontWeight:600,color:'var(--red)',marginTop:4,background:'var(--red-light)',borderRadius:6,padding:'2px 6px'}}>{r.acceptAnyBloodType?'✅ Any type welcome':'Matches your type'}</div>}
                      </div>
                    </div>
                    <div className="respond-card-prog">
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:'var(--text3)',marginBottom:4}}><span>{completed} donated</span><span>{remaining} needed</span></div>
                      <div style={{height:7,background:'var(--border)',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${pct}%`,background:'var(--red)',borderRadius:99}}/></div>
                    </div>
                    <div className="respond-card-footer">
                      {footer}
                      <button className="btn btn-ghost btn-sm" onClick={()=>setViewId(r._id)} style={{marginLeft:'auto'}}>👁</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>);
        })()}
      </div>

      {viewId && <ReqDetailModal reqId={viewId} onClose={()=>setViewId(null)}/>}
      {donateModal && <DonateModal patientName={donateModal.patientName} bloodType={donateModal.bloodType} onConfirm={respondToDonate} onCancel={()=>setDonateModal(null)}/>}
      {cancelTarget && <ConfirmModal title="Cancel Your Pledge?" body="Are you sure you want to withdraw your pledge for this request? The requester will no longer count on you." confirmLabel="✕ Cancel Pledge" danger onConfirm={cancelPledge} onCancel={()=>setCancelTarget(null)}/>}
    </div>
  );
}

function DonateModal({ patientName, bloodType, onConfirm, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [time, setTime] = useState('');
  const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none',boxSizing:'border-box'};
  return (
    <div className="modal-overlay open" id="donate-confirm-modal" onClick={onCancel}>
      <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3>Confirm Donation Pledge</h3><button className="modal-close" onClick={onCancel}>✕</button></div>
        <div style={{padding:20}} id="donate-confirm-body">
          <div style={{textAlign:'center',padding:'4px 0 12px'}}>
            <div style={{fontSize:'2.2rem',fontWeight:700,color:'var(--red)',fontFamily:'var(--font-display)',marginBottom:6}}>{bloodType}</div>
            <p style={{color:'var(--text2)',fontSize:'0.88rem'}}>You're committing to donate for <strong>{patientName}</strong>.</p>
            <p style={{fontSize:'0.75rem',color:'var(--text3)',marginTop:4}}>Optionally choose when you plan to donate below.</p>
          </div>
          <div style={{display:'grid',gap:10}}>
            <div><label style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text2)',display:'block',marginBottom:4}}>Scheduled Date (optional)</label>
              <input type="date" id="donate-schedule-date" value={date} min={today} onChange={e=>setDate(e.target.value)} style={IS}/>
            </div>
            <div><label style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text2)',display:'block',marginBottom:4}}>Scheduled Time (optional)</label>
              <input type="time" id="donate-schedule-time" value={time} onChange={e=>setTime(e.target.value)} style={IS}/>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button id="donate-confirm-no" className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button id="donate-confirm-yes" className="btn btn-primary" onClick={()=>onConfirm(date,time)}>🩸 Confirm &amp; Schedule</button>
        </div>
      </div>
    </div>
  );
}
