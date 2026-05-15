import { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const BT = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'9px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.85rem',outline:'none',boxSizing:'border-box'};

export default function ExportModal({ onClose }) {
  const { showToast } = useToast();
  const [datasets, setDatasets] = useState({ donors:true, requirements:true, info:true, users:false });
  const [fmt, setFmt]           = useState('xlsx');
  const [donorBlood, setDonorBlood] = useState('');
  const [donorAvail, setDonorAvail] = useState('');
  const [donorFrom,  setDonorFrom]  = useState('');
  const [donorTo,    setDonorTo]    = useState('');
  const [reqStatus,  setReqStatus]  = useState('');
  const [reqBlood,   setReqBlood]   = useState('');
  const [reqUrg,     setReqUrg]     = useState('');
  const [reqFrom,    setReqFrom]    = useState('');
  const [reqTo,      setReqTo]      = useState('');
  const [infoCategory, setInfoCat]  = useState('');
  const [step,       setStep]       = useState('config');
  const [result,     setResult]     = useState(null);
  const [exporting,  setExporting]  = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const toggle = k => setDatasets(p => ({ ...p, [k]: !p[k] }));

  function buildParams() {
    const ds = Object.entries(datasets).filter(([,v])=>v).map(([k])=>k).join(',');
    const p  = new URLSearchParams({ datasets: ds });
    if (donorBlood)      p.set('bloodType',    donorBlood);
    if (donorAvail!=='') p.set('available',    donorAvail);
    if (donorFrom)       p.set('donorDateFrom',donorFrom);
    if (donorTo)         p.set('donorDateTo',  donorTo);
    if (reqStatus)       p.set('reqStatus',    reqStatus);
    if (reqBlood)        p.set('reqBloodType', reqBlood);
    if (reqUrg)          p.set('reqUrgency',   reqUrg);
    if (reqFrom)         p.set('reqDateFrom',  reqFrom);
    if (reqTo)           p.set('reqDateTo',    reqTo);
    if (infoCategory)    p.set('infoCategory', infoCategory);
    return p;
  }

  async function runExportPreview() {
    const ds = Object.entries(datasets).filter(([,v])=>v);
    if (!ds.length) { showToast('Please select at least one dataset.','error'); return; }
    setPreviewing(true);
    const res = await apiFetch('/export?' + buildParams().toString());
    if (res.success) {
      const s = res.data.summary;
      const parts = [
        s.donors       !== null ? s.donors       + ' donors'       : '',
        s.requirements !== null ? s.requirements + ' requirements' : '',
        s.info         !== null ? s.info         + ' info entries'  : '',
        s.users        !== null ? s.users        + ' users'        : '',
      ].filter(Boolean).join(', ');
      showToast('Preview: ' + (parts || '0 rows'));
    } else showToast(res.error || 'Preview failed', 'error');
    setPreviewing(false);
  }

  async function runExport() {
    const ds = Object.entries(datasets).filter(([,v])=>v).map(([k])=>k);
    if (!ds.length) { showToast('Please select at least one dataset.','error'); return; }
    setExporting(true);
    const res = await apiFetch('/export?' + buildParams().toString());
    if (!res.success) { showToast(res.error||'Export failed','error'); setExporting(false); return; }

    const timestamp = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    const d = res.data;
    try {
      const { utils, writeFile } = await import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs').catch(()=>({utils:null,writeFile:null}));
      if (!utils) { showToast('SheetJS library unavailable.','error'); setExporting(false); return; }

      if (fmt === 'xlsx') {
        const wb = utils.book_new();
        const sheetMap = {
          donors:       { data:d.donors,       name:'Donors' },
          requirements: { data:d.requirements, name:'Requirements' },
          info:         { data:d.info,          name:'Info Directory' },
          users:        { data:d.users,         name:'Users' },
        };
        let hasSheet = false;
        Object.values(sheetMap).forEach(({data:rows,name}) => {
          if (!rows?.length) return;
          const ws = utils.json_to_sheet(rows);
          const cols = Object.keys(rows[0]);
          ws['!cols'] = cols.map(k => ({ wch: Math.min(40, Math.max(k.length+2,12)) }));
          utils.book_append_sheet(wb, ws, name); hasSheet = true;
        });
        if (!hasSheet) { showToast('No data to export.','error'); setExporting(false); return; }
        writeFile(wb, 'HSBlood_Export_' + timestamp + '.xlsx');
      } else if (fmt === 'csv') {
        const names = { donors:'Donors', requirements:'Requirements', info:'InfoDirectory', users:'Users' };
        let downloaded = 0;
        Object.entries({ donors:d.donors, requirements:d.requirements, info:d.info, users:d.users }).forEach(([key,rows]) => {
          if (!rows?.length) return;
          const ws  = utils.json_to_sheet(rows);
          const csv = utils.sheet_to_csv(ws);
          const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
          const url  = URL.createObjectURL(blob);
          const a    = document.createElement('a'); a.href=url; a.download='HSBlood_'+names[key]+'_'+timestamp+'.csv';
          document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          downloaded++;
        });
        if (!downloaded) { showToast('No data to export.','error'); setExporting(false); return; }
      } else {
        const obj = { exportedAt:d.summary.exportedAt, exportedBy:d.summary.exportedBy, summary:d.summary };
        if (d.donors)       obj.donors       = d.donors;
        if (d.requirements) obj.requirements = d.requirements;
        if (d.info)         obj.info          = d.info;
        if (d.users)        obj.users         = d.users;
        const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href=url; a.download='HSBlood_Export_'+timestamp+'.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      }

      setResult(d); setStep('result');
      const s = d.summary;
      const total = [s.donors,s.requirements,s.info,s.users].filter(n=>n!==null).reduce((a,b)=>a+b,0);
      showToast('Exported ' + total + ' rows as ' + fmt.toUpperCase());
    } catch(err) { showToast('Export failed: '+err.message,'error'); }
    setExporting(false);
  }

  const dsStyle = checked => ({
    display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
    borderRadius:10,border:'1.5px solid '+(checked?'var(--red)':'var(--border)'),
    background:checked?'var(--red-light)':'var(--bg3)',
    cursor:'pointer',fontFamily:'var(--font-ui)',fontSize:'0.85rem',fontWeight:600,
    transition:'border-color .15s',color:checked?'var(--red)':'var(--text2)',
  });
  const fmtStyle = checked => ({
    display:'flex',alignItems:'center',gap:8,padding:'10px 18px',
    borderRadius:10,border:'1.5px solid '+(checked?'var(--red)':'var(--border)'),
    background:checked?'var(--red-light)':'var(--bg3)',
    cursor:'pointer',fontFamily:'var(--font-ui)',fontSize:'0.85rem',
    fontWeight:checked?700:600,color:checked?'var(--red)':'var(--text2)',
  });

  return (
    <div className="modal-overlay open" id="export-modal" data-testid="export-modal" onClick={onClose}>
      <div className="modal" style={{maxWidth:680,width:'95%'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h3>📤 Export Data</h3>
          <button id="export-modal-close-btn" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {step === 'config' && (
          <div id="export-step-config">

            {/* Dataset selection */}
            <div id="export-section-datasets" className="section-divider" style={{marginBottom:14}}>Select Datasets</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
              {[['donors','👤 Donors'],['requirements','🩸 Requirements'],['info','📍 Info Directory'],['users','👥 Users']].map(([k,l]) => (
                <label key={k} id={'export-ds-'+k+'-label'} style={dsStyle(datasets[k])}>
                  <input type="checkbox" id={'export-ds-'+k} data-testid={'export-ds-'+k} value={k}
                    checked={datasets[k]} onChange={()=>toggle(k)} style={{width:16,height:16,accentColor:'var(--red)'}}/>
                  {l}
                </label>
              ))}
            </div>

            {/* Donor filters */}
            {datasets.donors && (
              <div id="export-donor-filters">
                <div id="export-section-donor-filters" className="section-divider" style={{marginBottom:12}}>
                  Donor Filters <span style={{fontWeight:400,color:'var(--text3)',fontSize:'0.78rem'}}>(optional)</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                  <div className="form-group"><label>Blood Type</label>
                    <select id="export-donor-blood" data-testid="export-donor-blood" style={IS} value={donorBlood} onChange={e=>setDonorBlood(e.target.value)}>
                      <option value="">All</option>{BT.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Availability</label>
                    <select id="export-donor-available" data-testid="export-donor-available" style={IS} value={donorAvail} onChange={e=>setDonorAvail(e.target.value)}>
                      <option value="">All</option><option value="true">Available</option><option value="false">Unavailable</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Registered From</label>
                    <input type="date" id="export-donor-date-from" data-testid="export-donor-date-from" style={IS} value={donorFrom} onChange={e=>setDonorFrom(e.target.value)}/>
                  </div>
                  <div className="form-group"><label>Registered To</label>
                    <input type="date" id="export-donor-date-to" data-testid="export-donor-date-to" style={IS} value={donorTo} onChange={e=>setDonorTo(e.target.value)}/>
                  </div>
                </div>
              </div>
            )}

            {/* Requirement filters */}
            {datasets.requirements && (
              <div id="export-req-filters">
                <div id="export-section-req-filters" className="section-divider" style={{marginBottom:12}}>
                  Requirement Filters <span style={{fontWeight:400,color:'var(--text3)',fontSize:'0.78rem'}}>(optional)</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
                  <div className="form-group"><label>Status</label>
                    <select id="export-req-status" data-testid="export-req-status" style={IS} value={reqStatus} onChange={e=>setReqStatus(e.target.value)}>
                      <option value="">All</option><option value="Open">Open</option><option value="Fulfilled">Fulfilled</option><option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Blood Type</label>
                    <select id="export-req-blood" data-testid="export-req-blood" style={IS} value={reqBlood} onChange={e=>setReqBlood(e.target.value)}>
                      <option value="">All</option>{BT.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Urgency</label>
                    <select id="export-req-urgency" data-testid="export-req-urgency" style={IS} value={reqUrg} onChange={e=>setReqUrg(e.target.value)}>
                      <option value="">All</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Created From</label>
                    <input type="date" id="export-req-date-from" data-testid="export-req-date-from" style={IS} value={reqFrom} onChange={e=>setReqFrom(e.target.value)}/>
                  </div>
                  <div className="form-group"><label>Created To</label>
                    <input type="date" id="export-req-date-to" data-testid="export-req-date-to" style={IS} value={reqTo} onChange={e=>setReqTo(e.target.value)}/>
                  </div>
                </div>
              </div>
            )}

            {/* Info filters */}
            {datasets.info && (
              <div id="export-info-filters">
                <div id="export-section-info-filters" className="section-divider" style={{marginBottom:12}}>
                  Info Directory Filters <span style={{fontWeight:400,color:'var(--text3)',fontSize:'0.78rem'}}>(optional)</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
                  <div className="form-group"><label>Category</label>
                    <select id="export-info-category" data-testid="export-info-category" style={IS} value={infoCategory} onChange={e=>setInfoCat(e.target.value)}>
                      <option value="">All Categories</option>
                      <option value="Hospital">🏥 Hospital</option>
                      <option value="Ambulance">🚑 Ambulance</option>
                      <option value="Blood Bank">🩸 Blood Bank</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Format */}
            <div id="export-section-format" className="section-divider" style={{marginBottom:12}}>Export Format</div>
            <div style={{display:'flex',gap:10,marginBottom:6}}>
              {[['xlsx','📊 Excel (.xlsx)'],['csv','📄 CSV (.csv)'],['json','🔧 JSON (.json)']].map(([v,l]) => (
                <label key={v} id={'export-fmt-'+v+'-label'} style={fmtStyle(fmt===v)}>
                  <input type="radio" id={'export-fmt-'+v} data-testid={'export-fmt-'+v}
                    name="export-format" value={v} checked={fmt===v} onChange={()=>setFmt(v)}
                    style={{accentColor:'var(--red)'}}/>
                  {l}
                </label>
              ))}
            </div>
            <p id="export-format-note" style={{fontSize:'0.72rem',color:'var(--text3)',fontFamily:'var(--font-ui)',marginBottom:4}}>
              Excel: one sheet per dataset. CSV: one file per dataset (zipped). JSON: single file with all datasets.
            </p>
          </div>
        )}

        {step === 'result' && result && (
          <div id="export-step-result">
            <div id="export-result-box" style={{borderRadius:10,padding:20,marginBottom:4,background:'#edfaf4',border:'1px solid #52c982'}}>
              <p style={{fontFamily:'var(--font-ui)',fontWeight:800,fontSize:'1rem',color:'#1a7a46',marginBottom:12}}>✅ Export Successful!</p>
              <div style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:12}}>
                {result.summary.donors!==null && <div><span style={{fontSize:'1.5rem',fontWeight:800,color:'#1a7a46',fontFamily:'var(--font-display)'}}>{result.summary.donors}</span><p style={{fontSize:'0.73rem',color:'var(--text2)',fontFamily:'var(--font-ui)'}}>Donors</p></div>}
                {result.summary.requirements!==null && <div><span style={{fontSize:'1.5rem',fontWeight:800,color:'#1a7a46',fontFamily:'var(--font-display)'}}>{result.summary.requirements}</span><p style={{fontSize:'0.73rem',color:'var(--text2)',fontFamily:'var(--font-ui)'}}>Requirements</p></div>}
                {result.summary.info!==null && <div><span style={{fontSize:'1.5rem',fontWeight:800,color:'#1a7a46',fontFamily:'var(--font-display)'}}>{result.summary.info}</span><p style={{fontSize:'0.73rem',color:'var(--text2)',fontFamily:'var(--font-ui)'}}>Info Entries</p></div>}
                {result.summary.users!==null && <div><span style={{fontSize:'1.5rem',fontWeight:800,color:'#1a7a46',fontFamily:'var(--font-display)'}}>{result.summary.users}</span><p style={{fontSize:'0.73rem',color:'var(--text2)',fontFamily:'var(--font-ui)'}}>Users</p></div>}
              </div>
              <p style={{fontSize:'0.75rem',color:'var(--text3)',fontFamily:'var(--font-ui)'}}>
                Format: {fmt.toUpperCase()} · Exported at {result.summary.exportedAt ? new Date(result.summary.exportedAt).toLocaleString() : '—'} · By {result.summary.exportedBy || '—'}
              </p>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button id="export-modal-cancel-btn" className="btn btn-outline" onClick={onClose}>
            {step === 'result' ? 'Close' : 'Cancel'}
          </button>
          {step === 'config' && <>
            <button id="export-preview-btn" data-testid="export-preview-btn" className="btn btn-outline"
              onClick={runExportPreview} disabled={previewing} style={{marginLeft:'auto'}}>
              {previewing ? '⏳ Counting…' : '🔍 Preview Count'}
            </button>
            <button id="export-download-btn" data-testid="export-download-btn" className="btn btn-primary"
              onClick={runExport} disabled={exporting}>
              {exporting ? '⏳ Exporting…' : '📤 Export & Download'}
            </button>
          </>}
        </div>
      </div>
    </div>
  );
}
