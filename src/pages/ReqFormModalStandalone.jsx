// Standalone ReqFormModal — used by MyRequestsPage so non-admin users can create requirements
// without navigating to the admin-only /requirements page.
import { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const BT  = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const IS  = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

export default function ReqFormModal({ onClose, onSaved }) {
  const { showToast } = useToast();
  const [f, setF]     = useState({ patientName:'', hospital:'', location:'', contactPerson:'', contactPhone:'', bloodType:'', acceptAnyBloodType:false, unitsRequired:1, requiredBy:'', status:'Open', notes:'' });
  const [saving, setSaving]   = useState(false);
  const [dupWarn, setDupWarn] = useState('');
  const up = (k,v) => setF(p => ({...p, [k]: v}));

  async function checkDup(field, val) {
    const patientName = field === 'patientName' ? val : f.patientName;
    const hospital    = field === 'hospital'    ? val : f.hospital;
    const bloodType   = field === 'bloodType'   ? val : f.bloodType;
    if (!patientName || !hospital || !bloodType) return;
    const res = await apiFetch('/requirements?status=Open');
    if (!res.success) return;
    const dup = res.data.find(r =>
      r.patientName.toLowerCase() === patientName.toLowerCase() &&
      r.hospital.toLowerCase()    === hospital.toLowerCase() &&
      r.bloodType                 === bloodType
    );
    if (dup) setDupWarn(`An open requirement already exists for "${dup.patientName}" at "${dup.hospital}" needing ${dup.bloodType} blood.`);
    else setDupWarn('');
  }

  async function save(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('save-req-btn-mr');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    setSaving(true);
    const body = { ...f, unitsRequired: parseInt(f.unitsRequired, 10), remainingUnits: parseInt(f.unitsRequired, 10) };
    const res  = await apiFetch('/requirements', { method: 'POST', body: JSON.stringify(body) });
    if (res.success) { showToast('Requirement saved!'); onSaved(res.data); }
    else { if (res.status === 409 || res.error?.toLowerCase().includes('already exists')) setDupWarn(res.error || 'Duplicate.'); showToast(res.error || 'Save failed.', 'error'); }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Requirement'; }
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" id="req-modal" onClick={onClose}>
      <div className="modal" style={{maxWidth:640}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 id="req-modal-title">New Blood Requirement</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{maxHeight:'70vh',overflowY:'auto'}}>
          {dupWarn && <div id="req-dup-warn" style={{background:'#FFF7ED',border:'1.5px solid #FED7AA',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:'0.82rem',color:'#92400E',fontFamily:'var(--font-ui)'}}><strong>⚠️ Duplicate Detected</strong><br/><span>{dupWarn}</span></div>}
          <div id="req-section-patient" className="section-divider">Patient &amp; Hospital</div>
          <div className="form-grid">
            <div className="form-group"><label>Patient Name *</label><input type="text" required style={IS} placeholder="e.g. Ravi Kumar" value={f.patientName} onChange={e=>up('patientName',e.target.value)} onBlur={e=>checkDup('patientName',e.target.value)}/></div>
            <div className="form-group"><label>Hospital / Centre *</label><input type="text" required style={IS} placeholder="e.g. PSG Hospital" value={f.hospital} onChange={e=>up('hospital',e.target.value)} onBlur={e=>checkDup('hospital',e.target.value)}/></div>
            <div className="form-group"><label>Location</label><input type="text" style={IS} placeholder="e.g. Coimbatore, Tamil Nadu" value={f.location} onChange={e=>up('location',e.target.value)}/></div>
            <div className="form-group"><label>Contact Person *</label><input type="text" required style={IS} placeholder="Name of coordinator" value={f.contactPerson} onChange={e=>up('contactPerson',e.target.value)}/></div>
            <div className="form-group"><label>Contact Phone *</label><input type="tel" required style={IS} placeholder="+91 98765 43210" value={f.contactPhone} onChange={e=>up('contactPhone',e.target.value)}/></div>
          </div>
          <div id="req-section-blood" className="section-divider">Blood Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Blood Type Required *</label>
              <select required={!f.acceptAnyBloodType} style={{...IS,cursor:'pointer',opacity:f.acceptAnyBloodType?0.5:1}} value={f.bloodType} onChange={e=>up('bloodType',e.target.value)} onBlur={e=>checkDup('bloodType',e.target.value)} disabled={f.acceptAnyBloodType}>
                <option value="">Select blood type</option>{BT.map(b=><option key={b}>{b}</option>)}
              </select>
              <input type="hidden" id="req-urgency" value="Critical"/>
              <label id="req-accept-any-label" className={`accept-any-checkbox${f.acceptAnyBloodType?' active':''}`} onClick={()=>up('acceptAnyBloodType',!f.acceptAnyBloodType)} style={{cursor:'pointer'}}>
                <span className="accept-any-check-wrap"><input type="checkbox" checked={f.acceptAnyBloodType} onChange={()=>{}} tabIndex={-1} style={{position:'absolute',opacity:0,pointerEvents:'none'}}/><span className="accept-any-check-box"/></span>
                <span className="accept-any-text"><span className="accept-any-title">Accept any blood type</span><span className="accept-any-sub">Any donor can volunteer, regardless of blood type</span></span>
              </label>
            </div>
            <div className="form-group"><label>Units Required *</label><input type="number" required min={1} style={IS} placeholder="e.g. 2" value={f.unitsRequired} onChange={e=>up('unitsRequired',e.target.value)}/></div>
            <div className="form-group"><label>Required By Date</label><input type="date" style={IS} value={f.requiredBy} onChange={e=>up('requiredBy',e.target.value)}/></div>
            <div className="form-group full"><label>Additional Notes</label><textarea style={{...IS,height:70,resize:'vertical'}} placeholder="Any special instructions or context…" value={f.notes} onChange={e=>up('notes',e.target.value)}/></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" id="save-req-btn-mr" onClick={save} disabled={saving} type="button">💾 Save Requirement</button>
        </div>
      </div>
    </div>
  );
}
