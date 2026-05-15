import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';
import { useToast } from '../context/ToastContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';
import ConfirmModal from '../components/ConfirmModal.jsx';

const URGENCY_ICON = {Critical:'🔴',High:'🟠',Medium:'🟡',Low:'🟢'};

export default function DonationHistoryPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/my-donations');
    if (res.success) setItems(res.data);
    else showToast(res.error || 'Failed to load.', 'error');
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('requirement:updated', load);

  const total     = items.length;
  const fulfilled = items.filter(d => d.status === 'Fulfilled').length;
  const recent    = items.filter(d => d.donatedAt && (Date.now()-new Date(d.donatedAt))/(1000*60*60*24) <= 30).length;

  async function cancelPledge() {
    const res = await apiFetch('/requirements/'+cancelTarget+'/donate', { method:'DELETE' });
    if (res.success) { showToast('Pledge cancelled successfully.', 'success'); load(); }
    else showToast(res.error || 'Could not cancel pledge. Please try again.', 'error');
    setCancelTarget(null);
  }

  return (
    <div id="page-donation-history" className="page">
      <div className="page-header">
        <h2>Donation <span>History</span></h2>
        <p>Your blood donation journey</p>
      </div>

      {/* Stats */}
      <div id="donation-history-stats" className="dash-stats" style={{marginBottom:18}}>
        <div className="dash-stat highlight"><div className="label">Total Donations</div><div className="value">{loading?'…':total}</div><div className="sub">All time</div></div>
        <div className="dash-stat"><div className="label" style={{color:'#15803D'}}>Helped Fulfill</div><div className="value" style={{color:'#15803D'}}>{loading?'…':fulfilled}</div><div className="sub">Fully met requests</div></div>
        <div className="dash-stat"><div className="label" style={{color:'#2563EB'}}>This Month</div><div className="value" style={{color:'#2563EB'}}>{loading?'…':recent}</div><div className="sub">Last 30 days</div></div>
      </div>

      <div id="donation-history-view">
        {loading ? <div className="spinner"/> : items.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🩸</div>
            <h4>No donations yet</h4>
            <p>You haven't responded to any blood requirements yet.</p>
            <button className="btn btn-primary" onClick={()=>navigate('/respond')} type="button">See Open Requests →</button>
          </div>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr>
              <th>Patient</th><th>Hospital / Location</th><th>Blood Type</th><th>Urgency</th>
              <th>Scheduled Date</th><th>Donation Status</th><th>Request Status</th><th></th>
            </tr></thead>
            <tbody>
              {items.map((d,i) => {
                const rsCls     = d.status==='Fulfilled'?'req-status-Fulfilled':d.status==='Cancelled'?'req-status-Cancelled':'req-status-Open';
                const donStatus = d.donationStatus || 'Pending';
                const isPending = donStatus === 'Pending';
                const donBadge  = isPending
                  ? <span style={{display:'inline-block',fontSize:'0.72rem',fontWeight:700,padding:'3px 10px',borderRadius:99,background:'#FEF3C7',color:'#92400E',border:'1px solid #FCD34D'}}>⏳ Pending</span>
                  : <span style={{display:'inline-block',fontSize:'0.72rem',fontWeight:700,padding:'3px 10px',borderRadius:99,background:'#DCFCE7',color:'#15803D',border:'1px solid #86EFAC'}}>✅ Completed</span>;
                const schedCell = d.scheduledDate
                  ? <><div style={{fontSize:'0.82rem',fontWeight:500}}>{formatDate(d.scheduledDate)}</div>{d.scheduledTime&&<div style={{fontSize:'0.72rem',color:'var(--text3)'}}>🕐 {d.scheduledTime}</div>}</>
                  : <span style={{color:'var(--text3)',fontSize:'0.78rem'}}>—</span>;
                return (
                  <tr key={i}>
                    <td className="bold">{d.patientName}</td>
                    <td><div>{d.hospital}</div>{d.location&&<div style={{fontSize:'0.72rem',color:'var(--text3)'}}>📍 {d.location}</div>}</td>
                    <td><span className="blood-badge">{d.bloodType}</span></td>
                    <td><span className={`urgency-badge urgency-${d.urgency}`}>{URGENCY_ICON[d.urgency]} {d.urgency}</span></td>
                    <td>{schedCell}</td>
                    <td>{donBadge}</td>
                    <td><span className={`req-status-badge ${rsCls}`}>{d.status}</span>{d.status==='Fulfilled'&&' 🎉'}</td>
                    <td>{isPending&&d.status==='Open'&&<button onClick={()=>setCancelTarget(d.requirementId)} style={{background:'#FFF1F2',color:'#BE123C',border:'1.5px solid #FECDD3',fontSize:'0.72rem',fontWeight:600,padding:'4px 10px',borderRadius:8,cursor:'pointer',fontFamily:'var(--font-ui)',whiteSpace:'nowrap'}}>✕ Cancel</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>

      {cancelTarget && <ConfirmModal title="Cancel Your Pledge?" body="Are you sure you want to withdraw your pledge for this request? The requester will no longer count on you." confirmLabel="✕ Cancel Pledge" danger onConfirm={cancelPledge} onCancel={()=>setCancelTarget(null)}/>}
    </div>
  );
}
