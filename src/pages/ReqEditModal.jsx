// Inline edit modal used by MyRequestsPage so users can edit their requirements
// without navigating to the admin-only /requirements page.
import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const BT = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none'};

export default function ReqEditModal({ reqId, onClose, onSaved }) {
  const { showToast } = useToast();
  const [f, setF]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dupWarn, setDupWarn] = useState('');
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    apiFetch('/requirements/' + reqId).then(res => {
      if (res.success) {
        const r = res.data;
        setF({
          patientName:       r.patientName       || '',
          hospital:          r.hospital           || '',
          location:          r.location           || '',
          contactPerson:     r.contactPerson      || '',
          contactPhone:      r.contactPhone       || '',
          bloodType:         r.bloodType          || '',
          acceptAnyBloodType:!!r.acceptAnyBloodType,
          unitsRequired:     r.unitsRequired      || 1,
          urgency:           r.urgency            || 'Critical',
          requiredBy:        r.requiredBy ? r.requiredBy.split('T')[0] : '',
          status:            r.status             || 'Open',
          notes:             r.notes              || '',
        });
      } else showToast('Could not load requirement.', 'error');
      setLoading(false);
    });
  }, [reqId]);

  async function save(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('req-edit-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    setSaving(true);
    const body = { ...f, unitsRequired: parseInt(f.unitsRequired, 10) };
    const res  = await apiFetch('/requirements/' + reqId, { method: 'PUT', body: JSON.stringify(body) });
    if (res.success) { showToast('Requirement updated!'); onSaved(res.data); }
    else {
      if (res.status === 409 || res.error?.toLowerCase().includes('already exists')) setDupWarn(res.error || 'Duplicate requirement.');
      else showToast(res.error || 'Save failed.', 'error');
    }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; }
    setSaving(false);
  }

  if (loading || !f) return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="spinner" style={{ margin: '48px auto' }}/>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Blood Requirement</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={save} style={{ maxHeight:'70vh', overflowY:'auto' }}>
          {dupWarn && (
            <div style={{ background:'#FFF7ED', border:'1.5px solid #FED7AA', borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:'0.82rem', color:'#92400E', fontFamily:'var(--font-ui)' }}>
              <strong>⚠️ Duplicate Detected</strong><br/>{dupWarn}
            </div>
          )}

          <div className="section-divider">Patient &amp; Hospital</div>
          <div className="form-grid">
            <div className="form-group"><label>Patient Name *</label><input type="text" required style={IS} value={f.patientName} onChange={e=>up('patientName',e.target.value)}/></div>
            <div className="form-group"><label>Hospital / Centre *</label><input type="text" required style={IS} value={f.hospital} onChange={e=>up('hospital',e.target.value)}/></div>
            <div className="form-group"><label>Location</label><input type="text" style={IS} value={f.location} onChange={e=>up('location',e.target.value)}/></div>
            <div className="form-group"><label>Contact Person *</label><input type="text" required style={IS} value={f.contactPerson} onChange={e=>up('contactPerson',e.target.value)}/></div>
            <div className="form-group"><label>Contact Phone *</label><input type="tel" required style={IS} value={f.contactPhone} onChange={e=>up('contactPhone',e.target.value)}/></div>
          </div>

          <div className="section-divider">Blood Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Blood Type Required *</label>
              <select required={!f.acceptAnyBloodType} style={{...IS,cursor:'pointer',opacity:f.acceptAnyBloodType?0.5:1}} value={f.bloodType} onChange={e=>up('bloodType',e.target.value)} disabled={f.acceptAnyBloodType}>
                <option value="">Select blood type</option>{BT.map(b=><option key={b}>{b}</option>)}
              </select>
              <input type="hidden" value={f.urgency}/>
              <label className={`accept-any-checkbox${f.acceptAnyBloodType?' active':''}`} onClick={()=>up('acceptAnyBloodType',!f.acceptAnyBloodType)} style={{cursor:'pointer'}}>
                <span className="accept-any-check-wrap"><input type="checkbox" checked={f.acceptAnyBloodType} onChange={()=>{}} tabIndex={-1} style={{position:'absolute',opacity:0,pointerEvents:'none'}}/><span className="accept-any-check-box"/></span>
                <span className="accept-any-text"><span className="accept-any-title">Accept any blood type</span><span className="accept-any-sub">Any donor can volunteer, regardless of blood type</span></span>
              </label>
            </div>
            <div className="form-group"><label>Units Required *</label><input type="number" required min={1} style={IS} value={f.unitsRequired} onChange={e=>up('unitsRequired',e.target.value)}/></div>
            <div className="form-group"><label>Required By Date</label><input type="date" style={IS} value={f.requiredBy} onChange={e=>up('requiredBy',e.target.value)}/></div>
            <div className="form-group"><label>Status</label>
              <select style={{...IS,cursor:'pointer'}} value={f.status} onChange={e=>up('status',e.target.value)}>
                {['Open','Fulfilled','Cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group full"><label>Additional Notes</label><textarea style={{...IS,height:70,resize:'vertical'}} value={f.notes} onChange={e=>up('notes',e.target.value)}/></div>
          </div>
        </form>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose} type="button">Cancel</button>
          <button className="btn btn-primary" id="req-edit-save-btn" onClick={save} disabled={saving} type="button">💾 Save Changes</button>
        </div>
      </div>
    </div>
  );
}
