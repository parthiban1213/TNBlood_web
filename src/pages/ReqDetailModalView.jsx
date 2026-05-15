// Read-only requirement detail modal — used by RespondPage and MyRequestsPage
import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';

const URGENCY_ICON = { Critical:'🔴', High:'🟠', Medium:'🟡', Low:'🟢' };

export default function ReqDetailModalView({ reqId, onClose }) {
  const [r, setR] = useState(null);

  useEffect(() => {
    apiFetch('/requirements/' + reqId).then(res => {
      if (res.success) setR(res.data);
    });
  }, [reqId]);

  if (!r) return (
    <div className="modal-overlay open" id="req-detail-modal" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="spinner" style={{ margin: '48px auto' }}/>
      </div>
    </div>
  );

  const completed = (r.donations || []).filter(d => d.donationStatus === 'Completed').length;
  const pending   = (r.donations || []).filter(d => (d.donationStatus || 'Pending') === 'Pending').length;
  const total     = r.unitsRequired;
  const remaining = r.remainingUnits != null ? r.remainingUnits : total;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;
  const barColor  = pct === 100 ? '#15803D' : 'var(--red)';

  return (
    <div className="modal-overlay open" id="req-detail-modal" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Requirement Details</h3>
          <button id="req-detail-modal-close-btn" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div id="req-detail-content" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 4px' }}>
          {/* Patient + blood type header */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16, padding:16, background:'var(--red-light)', borderRadius:12, border:'1px solid rgba(200,16,46,0.1)' }}>
            <div style={{ flex:1 }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.45rem', color:'var(--text)' }}>{r.patientName}</h2>
              <p style={{ color:'var(--text2)', fontSize:'0.82rem', marginTop:3 }}>🏥 {r.hospital}</p>
              {r.location && <p style={{ color:'var(--text2)', fontSize:'0.82rem', marginTop:2 }}>📍 {r.location}</p>}
              <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap', alignItems:'center' }}>
                <span className={`urgency-badge urgency-${r.urgency}`}>{URGENCY_ICON[r.urgency]} {r.urgency}</span>
                <span className={`req-status-badge req-status-${r.status}`}>{r.status}</span>
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'2.5rem', fontWeight:700, color:'var(--red)', lineHeight:1 }}>{r.bloodType}</div>
              {r.acceptAnyBloodType && <div style={{ fontFamily:'var(--font-ui)', fontSize:'0.68rem', fontWeight:700, color:'var(--red)', marginTop:4, background:'var(--red-light)', border:'1px solid rgba(200,16,46,.2)', borderRadius:6, padding:'2px 7px' }}>✅ Any type welcome</div>}
              <div style={{ fontFamily:'var(--font-ui)', fontSize:'0.75rem', color:'var(--text2)', marginTop:3 }}>{r.unitsRequired} unit{r.unitsRequired !== 1 ? 's' : ''} needed</div>
            </div>
          </div>

          {/* Progress stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
            {[['Required', total, 'var(--red)'], ['Donated', completed, '#15803D'], ['Remaining', remaining, '#D97706']].map(([l, v, col]) => (
              <div key={l} className="status-stat-card">
                <div className="status-stat-val" style={{ color: col }}>{v}</div>
                <div className="status-stat-label">{l}</div>
              </div>
            ))}
          </div>

          {pending > 0 && r.status !== 'Fulfilled' && (
            <div style={{ fontSize:'0.75rem', color:'#92400E', background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:8, padding:'6px 12px', marginBottom:12 }}>
              ⏳ {pending} donor{pending > 1 ? 's' : ''} scheduled — awaiting confirmation
            </div>
          )}

          {/* Progress bar */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text3)', marginBottom:5 }}>
              <span>Fulfillment progress</span>
              <span style={{ fontWeight:700, color:'var(--text)' }}>{pct}%</span>
            </div>
            <div style={{ height:9, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:barColor, borderRadius:99, transition:'width 0.6s ease' }}/>
            </div>
          </div>

          {/* Detail fields */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[
              ['Contact Person', r.contactPerson],
              ['Phone', r.contactPhone],
              r.location && ['Location', '📍 ' + r.location],
              ['Required By', formatDate(r.requiredBy)],
              ['Created By', r.createdBy || '—'],
              ['Created On', formatDate(r.createdAt)],
              ['Last Updated', formatDate(r.updatedAt)],
            ].filter(Boolean).map(([k, v]) => (
              <div key={k} className="detail-field">
                <div className="dk">{k}</div>
                <div className="dv">{v || '—'}</div>
              </div>
            ))}
            {r.notes && (
              <div className="detail-field" style={{ gridColumn:'1/-1' }}>
                <div className="dk">Notes</div>
                <div className="dv">{r.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
