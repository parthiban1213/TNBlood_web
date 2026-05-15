import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const BADGE_META = { first_drop:{icon:'⭐',label:'First Drop'}, life_saver:{icon:'❤️',label:'Life Saver'}, on_time:{icon:'⏰',label:'On Time'}, rapid_responder:{icon:'🛡️',label:'Rapid Responder'}, platinum:{icon:'💎',label:'Platinum Donor'}, legend:{icon:'🏆',label:'Legend'} };
const BADGE_DEFAULTS = [
  {id:'first_drop',name:'First Drop',description:'Make your first blood donation pledge',earnedDescription:'Complete 1 donation'},
  {id:'life_saver',name:'Life Saver',description:'Donated 3 times — real impact!',earnedDescription:'Complete 3 donations'},
  {id:'on_time',name:'On Time Hero',description:'Fulfilled a pledge within 24 hours',earnedDescription:'Complete 2 donations'},
  {id:'rapid_responder',name:'Rapid Responder',description:'Responded within 1 hour of posting',earnedDescription:'Respond within 1 hour of a request'},
  {id:'platinum',name:'Platinum Donor',description:'Reached Platinum tier — 15+ donations!',earnedDescription:'Complete 15 donations'},
  {id:'legend',name:'Legend',description:'The highest honour — 25+ donations!',earnedDescription:'Complete 25 donations'},
];

function fmtDate(d){if(!d)return '';try{return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});}catch{return '';}}
function fmtDateLong(d){if(!d)return '';try{return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}catch{return '';}}
function initials(name){const p=(name||'').trim().split(/\s+/).filter(Boolean);if(!p.length)return '?';if(p.length===1)return p[0][0].toUpperCase();return (p[0][0]+p[p.length-1][0]).toUpperCase();}

export default function RewardsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab]   = useState('leaderboard');
  const [gamData, setGamData] = useState(null);
  const [lb, setLb]     = useState([]);
  const [lbScope, setLbScope] = useState('city');
  const [cfFilter, setCfFilter] = useState('All');
  const [loading, setLoading]   = useState(true);
  const [lbLoading, setLbLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [me, lbRes] = await Promise.all([apiFetch('/gamification/me'), apiFetch('/gamification/leaderboard?scope=city&limit=25')]);
    if (me.success) setGamData(me.data);
    if (lbRes.success) setLb(lbRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function switchScope(scope) {
    setLbScope(scope); setLbLoading(true);
    const res = await apiFetch('/gamification/leaderboard?scope='+scope+'&limit=25');
    if (res.success) setLb(res.data || []);
    setLbLoading(false);
  }

  if (loading) return <div className="page"><div className="page-header"><h2>Rewards <span>& Gamification</span></h2></div><div className="spinner" style={{marginTop:60}}/></div>;
  if (!gamData) return (
    <div className="page"><div className="page-header"><h2>Rewards <span>& Gamification</span></h2></div>
      <div className="rw-error"><div className="rw-error-icon">📡</div><p>Could not load rewards data.</p><button className="btn btn-primary" onClick={load}>Try Again</button></div>
    </div>
  );

  const me = lb.find(e=>e.isCurrentUser) || {displayName:user?.username||'You',tier:gamData.tier,donationCount:gamData.donationCount,xp:gamData.xp,rank:gamData.cityRank,isCurrentUser:true};

  return (
    <div id="page-rewards" className="page">
      <div className="page-header"><h2>Rewards <span>& Gamification</span></h2><p>Leaderboard, challenges, and badges</p></div>
      <div id="rewards-root">
        <div className="rw-tabs">
          {[['leaderboard','🏆 Leaderboard'],['challenges','⚡ Challenges'],['badges','🎖️ Badges']].map(([t,l])=>(
            <button key={t} className={'rw-tab'+(tab===t?' active':'')} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>
        <div id="rewards-tab-content" className="rw-content">
          {tab === 'leaderboard' && (
            <>
              <div className="rw-hero-card">
                <div className="rw-hero-rank">#{me.rank||gamData.cityRank||'—'}</div>
                <div className="rw-avatar rw-avatar-you">{initials(me.displayName||user?.username||'?')}</div>
                <div className="rw-hero-info">
                  <div className="rw-hero-name">{me.displayName||user?.username} <span className="rw-you-tag">YOU</span></div>
                  <div className="rw-hero-meta">{gamData.tier} · {me.bloodType||''}</div>
                </div>
                <div className="rw-hero-xp">{gamData.xp} <span>XP</span></div>
              </div>
              <div className="rw-pills" style={{marginBottom:14}}>
                {[['city','📍 My City'],['all','🌐 All']].map(([s,l])=>(
                  <button key={s} className={'rw-pill'+(lbScope===s?' active':'')} onClick={()=>switchScope(s)}>{l}</button>
                ))}
              </div>
              <div className="rw-lb-header"><span className="rw-lb-rank-col">#</span><span style={{flex:1,marginLeft:50}}>Donor</span><span className="rw-lb-num-col">Donations</span><span className="rw-lb-num-col">XP</span></div>
              <div className="rw-card rw-lb-list">
                {lbLoading ? <div className="spinner" style={{margin:'30px auto'}}/> : lb.length === 0 ? <p className="rw-empty">No donors found in this scope.</p> : lb.map(e=>{
                  const isMe = e.isCurrentUser;
                  const rankColor = e.rank===1?'#F59E0B':e.rank===2?'#94A3B8':e.rank===3?'#CD7F3A':'var(--text3)';
                  return (<div key={e.username||e.rank} className={'rw-lb-row'+(isMe?' rw-lb-row-me':'')}>
                    <span className="rw-lb-rank" style={{color:rankColor}}>{e.rank}</span>
                    <span className={'rw-avatar'+(isMe?' rw-avatar-you':' rw-avatar-other')}>{initials(e.displayName||e.username||'?')}</span>
                    <span className="rw-lb-name-col"><span className={'rw-lb-name'+(isMe?' rw-name-me':'')}>{e.displayName||e.username}{isMe&&<span className="rw-you-tag">YOU</span>}</span><span className="rw-lb-sub">{e.bloodType||''} · {e.tier||''}</span></span>
                    <span className="rw-lb-num-col rw-lb-donations">{e.donationCount}</span>
                    <span className="rw-lb-num-col rw-lb-xp">{e.xp}</span>
                  </div>);
                })}
              </div>
            </>
          )}
          {tab === 'challenges' && (
            <>
              <div className="rw-pills" style={{marginBottom:16}}>
                {['All','Active','Completed'].map(f=><button key={f} className={'rw-pill'+(cfFilter===f?' rw-pill-dark active':'')} onClick={()=>setCfFilter(f)}>{f}</button>)}
              </div>
              <div className="rw-challenges-list">
                {(()=>{
                  const all = gamData.challenges||[];
                  const filtered = cfFilter==='Active'?all.filter(c=>!c.isCompleted):cfFilter==='Completed'?all.filter(c=>c.isCompleted):all;
                  if(!filtered.length) return <p className="rw-empty">No challenges to show.</p>;
                  return filtered.map(c=>{
                    const done = c.isCompleted;
                    const pct  = c.progressTotal>0?Math.min(Math.round((c.progressCurrent/c.progressTotal)*100),100):0;
                    return (
                      <div key={c.id} className={'rw-challenge-card'+(done?' rw-challenge-done':'')}>
                        <div className="rw-challenge-top">
                          <div className={'rw-challenge-icon'+(done?' rw-icon-done':'')}>{done?'✅':'🎯'}</div>
                          <div className={'rw-challenge-title'+(done?' rw-title-done':'')}>{c.title}</div>
                          <div className={'rw-xp-badge'+(done?' rw-xp-earned':' rw-xp-pending')}>+{c.xpReward} XP</div>
                        </div>
                        <p className="rw-challenge-desc">{c.description}</p>
                        <div className="rw-progress-bar"><div className={'rw-progress-fill'+(done?' rw-fill-done':'')} style={{width:pct+'%'}}/></div>
                        <div className="rw-challenge-footer">
                          <span className={done?'rw-done-text':'rw-meta-text'}>{done&&c.completedAt?'Completed · '+fmtDate(c.completedAt):c.progressCurrent+' of '+c.progressTotal+' done'}</span>
                          <span className="rw-deadline-text">{done?'+'+c.xpReward+' XP earned':c.deadline?'Ends '+fmtDate(c.deadline):'Ongoing'}</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}
          {tab === 'badges' && (
            <>
              {(()=>{
                const earnedMap = {};
                (gamData.badges||[]).forEach(b=>{earnedMap[b.id]=b;});
                const all = BADGE_DEFAULTS.map(def=>({...def,earnedAt:earnedMap[def.id]?.earnedAt||null,isEarned:!!earnedMap[def.id]?.earnedAt}));
                const earned = all.filter(b=>b.isEarned);
                const locked = all.filter(b=>!b.isEarned);
                return(<>
                  <p className="rw-badge-summary">{earned.length} of {all.length} badges earned</p>
                  {earned.length>0&&(<>
                    <div className="rw-badge-section-header"><span className="rw-badge-section-label rw-section-earned">EARNED</span><span className="rw-badge-count rw-count-earned">{earned.length}</span></div>
                    <div className="rw-card" style={{marginBottom:20}}>
                      {earned.map((b,i)=><BadgeRow key={b.id} b={b} locked={false} divider={i<earned.length-1}/>)}
                    </div>
                  </>)}
                  {locked.length>0&&(<>
                    <div className="rw-badge-section-header"><span className="rw-badge-section-label rw-section-locked">LOCKED</span><span className="rw-badge-count rw-count-locked">{locked.length}</span></div>
                    <div className="rw-card">
                      {locked.map((b,i)=><BadgeRow key={b.id} b={b} locked={true} divider={i<locked.length-1}/>)}
                    </div>
                  </>)}
                </>);
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BadgeRow({b,locked,divider}){
  const meta=BADGE_META[b.id]||{icon:'🎖️'};
  return(<>
    <div className={'rw-badge-row'+(locked?' rw-badge-locked':'')}>
      <div className={'rw-badge-icon-wrap'+(locked?' rw-badge-icon-locked':' rw-badge-icon-earned')}><span className="rw-badge-emoji">{meta.icon}</span></div>
      <div className="rw-badge-info">
        <div className="rw-badge-name">{b.name}</div>
        <div className="rw-badge-desc">{locked?b.earnedDescription:b.description}</div>
        {!locked&&b.earnedAt&&<div className="rw-badge-earned-date">Earned {fmtDateLong(b.earnedAt)}</div>}
      </div>
      <div className={'rw-badge-status'+(locked?' rw-status-locked':' rw-status-earned')}>{locked?'Locked':'Earned'}</div>
    </div>
    {divider&&<div className="rw-divider rw-divider-indent"/>}
  </>);
}
