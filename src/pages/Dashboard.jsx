import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocketEvent } from '../hooks/useSocketEvent.js';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats,  setStats]  = useState(null);
  const [donors, setDonors] = useState(null);
  const [reqs,   setReqs]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,  setError]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    const [sRes, dRes, rRes] = await Promise.all([
      apiFetch('/stats'), apiFetch('/donors'), apiFetch('/requirements'),
    ]);
    if (sRes.success) setStats(sRes.data); else setError(true);
    if (dRes.success) setDonors(dRes.data);
    if (rRes.success) setReqs(rRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocketEvent('donor:created',       load);
  useSocketEvent('requirement:created', load);
  useSocketEvent('requirement:updated', load);

  const openReqs = reqs ? reqs.filter(r => r.status === 'Open').length : '—';
  const helped    = stats?.peopleHelped || 0;
  const fulfilled = stats?.fulfilledRequirements || 0;
  const units     = stats?.unitsDelivered || 0;

  const byBT = stats?.byBloodType || [];
  const max  = byBT.length ? Math.max(...byBT.map(x => x.count), 1) : 1;

  const recent = donors ? donors.slice(0, 6) : [];

  const username = user?.firstName || user?.username || 'there';

  return (
    <div id="page-dashboard" className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p id="dash-welcome">Welcome back, {user?.username}! You are logged in as {isAdmin?'Administrator':'TN user'}.</p>
      </div>

      {/* Stats row */}
      <div id="dash-stats-row" className="dash-stats">
        <div id="dash-stat-total-donors" className="dash-stat highlight">
          <div className="label">Total Donors</div>
          <div className="value" id="d-total">{loading ? <Dot/> : (stats?.totalDonors ?? '—')}</div>
          <div className="sub">Registered donors</div>
        </div>
        <div id="dash-stat-available-now" className="dash-stat">
          <div className="label">Available Now</div>
          <div className="value" id="d-available">{loading ? <Dot/> : (stats?.availableDonors ?? '—')}</div>
          <div className="sub">Ready to donate</div>
        </div>
        <div id="dash-stat-blood-types" className="dash-stat">
          <div className="label">Blood Types</div>
          <div className="value">8</div>
          <div className="sub">All groups covered</div>
        </div>
        <div className="dash-stat" style={{cursor:'pointer'}} id="dash-stat-requirements"
          onClick={() => navigate(isAdmin ? '/requirements' : '/respond')}>
          <div className="label">Open Requests</div>
          <div className="value" id="d-open-reqs" style={{color:'#DC2626'}}>{loading ? <Dot/> : openReqs}</div>
          <div className="sub">Needs donors</div>
        </div>
      </div>

      {/* Benefitted banner */}
      <div data-testid="benefitted-banner" id="benefitted-banner" style={{
        background:'linear-gradient(135deg,#9B0B22 0%,#C8102E 60%,#e8294a 100%)',
        borderRadius:'var(--radius)',padding:'22px 28px',marginBottom:22,
        display:'flex',alignItems:'center',justifyContent:'space-between',
        gap:20,boxShadow:'0 8px 32px rgba(200,16,46,0.28)',
        animation:'fadeUp .4s ease both',animationDelay:'.18s',flexWrap:'wrap',
      }}>
        <div>
          <div style={{fontFamily:'var(--font-ui)',fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>🩸 People Benefitted</div>
          <div style={{display:'flex',alignItems:'baseline',gap:14,flexWrap:'wrap'}}>
            <span data-testid="d-benefitted" style={{fontFamily:'var(--font-display)',fontSize:'2.8rem',fontWeight:700,color:'#fff',lineHeight:1}} id="d-benefitted">
              {loading ? '…' : helped.toLocaleString()}
            </span>
            <span style={{color:'rgba(255,255,255,0.7)',fontSize:'0.82rem',fontFamily:'var(--font-ui)'}}>
              Calculated from <span id="d-fulfilled-count" style={{fontWeight:700,color:'rgba(255,255,255,0.9)'}}>{loading ? '…' : fulfilled}</span> fulfilled blood requirement(s) &middot; total units delivered
            </span>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontFamily:'var(--font-ui)',fontSize:'0.72rem',fontWeight:700,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>💉 Units Delivered</div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'2rem',fontWeight:700,color:'#fff',lineHeight:1}} id="d-benefitted-2">
            {loading ? '…' : units.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 2-col grid: chart + compatibility */}
      <div id="dash-2col-grid" className="dash-2col-grid">
        <div className="card">
          <div className="card-title">Donors by Blood Type</div>
          <div className="bt-chart" id="bt-chart" data-testid="bt-chart">
            {loading ? <div className="spinner"/> : error ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <p style={{color:'var(--text3)',fontSize:'0.8rem',marginBottom:10}}>⚠️ Failed to load stats</p>
                <button id="btn-dashboard-retry" className="btn btn-outline btn-sm" onClick={load}>↻ Retry</button>
              </div>
            ) : byBT.length ? byBT.map(b => (
              <div key={b._id} className="bt-bar-row">
                <div className="bt-bar-label">{b._id}</div>
                <div className="bt-bar-track"><div className="bt-bar-fill" style={{width:`${(b.count/max)*100}%`}}/></div>
                <div className="bt-bar-count">{b.count}</div>
              </div>
            )) : <p style={{color:'var(--text3)',fontSize:'0.81rem'}}>No donors yet.</p>}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Compatibility Reference</div>
          <div style={{overflowX:'auto'}}>
            <table style={{fontSize:'0.75rem'}}>
              <thead><tr><th>Type</th><th>Donates To</th><th>Receives From</th></tr></thead>
              <tbody>
                {[['A+','A+, AB+','A+, A−, O+, O−'],['A-','A+, A−, AB+, AB−','A−, O−'],
                  ['B+','B+, AB+','B+, B−, O+, O−'],['B-','B+, B−, AB+, AB−','B−, O−'],
                  ['AB+','AB+ only','All types'],['AB-','AB+, AB−','A−, B−, AB−, O−'],
                  ['O+','A+, B+, O+, AB+','O+, O−'],['O-','All types','O− only']].map(([t,d,r])=>(
                  <tr key={t}><td><span className="blood-badge">{t}</span></td><td>{d}</td><td>{r}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent donors */}
      <div className="card" style={{marginTop:15}}>
        <div className="card-title">Recent Donors</div>
        <div id="recent-donors-table" data-testid="recent-donors-table">
          {loading ? <div className="spinner"/> : !donors ? (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <p style={{color:'var(--text3)',fontSize:'0.8rem',marginBottom:10}}>⚠️ Failed to load recent donors</p>
              <button id="btn-dashboard-donors-retry" className="btn btn-outline btn-sm" onClick={load}>↻ Retry</button>
            </div>
          ) : recent.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th>Name</th><th>Blood Type</th><th>Phone</th><th>Status</th><th>Registered</th></tr></thead>
              <tbody>
                {recent.map(d => (
                  <tr key={d._id}>
                    <td className="bold">{d.firstName} {d.lastName}</td>
                    <td><span className="blood-badge">{d.bloodType}</span></td>
                    <td>{d.phone}</td>
                    <td><span className={`status-dot ${d.isAvailable?'available':'unavailable'}`}>{d.isAvailable?'Available':'Unavailable'}</span></td>
                    <td>{formatDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <div className="empty-state"><div className="emoji">🩸</div><h4>No donors yet</h4><p>Register the first donor!</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dot() { return <span style={{opacity:0.4,fontSize:'1.2rem'}}>…</span>; }
