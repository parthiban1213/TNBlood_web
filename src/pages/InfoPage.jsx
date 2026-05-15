import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import BulkModal from '../components/BulkModal.jsx';

const IS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:9,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.88rem',outline:'none',boxSizing:'border-box'};
const FGIS = {width:'100%',background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'10px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.86rem',outline:'none',transition:'border-color .17s'};

function catIcon(c) { return c==='Ambulance'?'🚑':c==='Blood Bank'?'🩸':'🏥'; }
function catCls(c)  { return c==='Ambulance'?'ambulance':c==='Blood Bank'?'bloodbank':'hospital'; }
const MAP_COLORS = { Hospital:'#C8102E', Ambulance:'#EA580C', 'Blood Bank':'#BE123C' };

export default function InfoPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('list');
  const [tab, setTab]           = useState('all');
  const [search, setSearch]     = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const mapRef      = useRef(null);
  const mapElRef    = useRef(null);
  const markersRef  = useRef([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch('/info');
    if (res.success) setItems(res.data || []);
    else showToast(res.error || 'Failed to load.', 'error');
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(e => {
    const q = search.toLowerCase();
    const matchTab = tab === 'all' || e.category === tab;
    const matchQ   = !q || (e.name||'').toLowerCase().includes(q) || (e.area||'').toLowerCase().includes(q) || (e.phone||'').toLowerCase().includes(q) || (e.address||'').toLowerCase().includes(q);
    return matchTab && matchQ;
  });

  // Map init
  function initMap() {
    const el = mapElRef.current;
    if (!el || !window.L || mapRef.current) return;
    const L = window.L;
    mapRef.current = L.map(el, { zoomControl: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(mapRef.current);
    refreshMarkers();
  }

  function refreshMarkers() {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    markersRef.current.forEach(m => m.remove()); markersRef.current = [];
    filtered.forEach(e => {
      if (!e.lat || !e.lng) return;
      const color = MAP_COLORS[e.category] || '#94A3B8';
      const icon  = L.divIcon({ className:'', html:`<div style="width:22px;height:22px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`, iconSize:[22,22], iconAnchor:[11,11], popupAnchor:[0,-13] });
      const popup = L.popup({ className:'lf-popup' }).setContent(
        `<div style="padding:10px 13px;min-width:160px"><div style="font-family:var(--font-ui);font-weight:700;font-size:0.88rem;color:#18213A;margin-bottom:2px">${catIcon(e.category)} ${e.name}</div>${e.area?`<div style="font-size:0.75rem;color:#6B7280;margin-top:2px">📍 ${e.area}</div>`:''}<div style="font-size:0.78rem;font-weight:600;color:#C8102E;margin-top:4px">📞 ${e.phone}</div>${e.available24h?'<div style="font-size:0.7rem;background:#EDFBF3;color:#15803D;border:1px solid #BBF7D0;border-radius:5px;padding:2px 8px;display:inline-block;margin-top:4px">✅ Available 24 hours</div>':''}</div>`
      );
      const m = L.marker([e.lat, e.lng], { icon }).bindPopup(popup).addTo(mapRef.current);
      markersRef.current.push(m);
    });
  }

  function focusMarker(e) {
    if (!mapRef.current || !e.lat || !e.lng) return;
    mapRef.current.setView([e.lat, e.lng], 14);
    const m = markersRef.current.find(mk => { const ll = mk.getLatLng(); return Math.abs(ll.lat-e.lat)<0.0001 && Math.abs(ll.lng-e.lng)<0.0001; });
    if (m) m.openPopup();
    document.querySelectorAll('.info-map-item').forEach(el => el.classList.remove('active'));
    document.getElementById('mapitem-'+e._id)?.classList.add('active');
  }

  function switchToMap() {
    setView('map');
    setTimeout(() => { if (!mapRef.current) initMap(); else { mapRef.current.invalidateSize(); refreshMarkers(); } }, 60);
  }

  useEffect(() => { if (view === 'map' && mapRef.current) refreshMarkers(); }, [filtered.length, view]);
  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  async function doDelete() {
    const res = await apiFetch('/info/' + deleteTarget._id, { method: 'DELETE' });
    if (res.success) { setItems(p => p.filter(x => x._id !== deleteTarget._id)); showToast('Entry deleted.'); setDeleteTarget(null); }
    else showToast(res.error || 'Failed to delete.', 'error');
  }

  return (
    <div id="page-info" className="page">
      <div className="page-header-row page-header">
        <div><h2>Info <span>Directory</span></h2><p>Ambulance services and hospitals for quick reference</p></div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <div id="info-admin-btn" style={{display:'flex',gap:8}}>
            {isAdmin
              ? <><button className="btn btn-primary" id="btn-open-info-modal" onClick={()=>{setEditId(null);setFormOpen(true);}}>➕ Add Entry</button>
                  <button className="btn btn-outline" onClick={()=>setBulkOpen(true)}>📥 Bulk Upload</button></>
              : <span className="lock-badge">🔒 View Only</span>}
          </div>
          <div className="view-toggle">
            <button className={view==='list'?'active':''} id="info-toggle-list" onClick={()=>setView('list')} title="List view">☰ List</button>
            <button className={view==='map'?'active':''} id="info-toggle-map"  onClick={switchToMap} title="Map view">🗺 Map</button>
          </div>
        </div>
      </div>

      {/* Category tabs + search */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        {[['all','All'],['Hospital','🏥 Hospital'],['Ambulance','🚑 Ambulance'],['Blood Bank','🩸 Blood Bank']].map(([v,l]) => (
          <button key={v} id={'info-tab-'+v.toLowerCase().replace(/ /g,'-')} className={`info-tab${tab===v?' active':''}`} onClick={()=>setTab(v)}>{l}</button>
        ))}
        <div className="search-bar" style={{marginLeft:'auto'}}>
          <span style={{color:'var(--text3)'}}>🔍</span>
          <input type="text" id="info-search" placeholder="Search name, area, phone…" value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>

      {/* LIST VIEW */}
      <div id="info-list-view" style={{display:view==='list'?'':'none'}}>
        <div id="info-grid" data-testid="info-grid" className="info-grid-layout">
          {loading ? <div className="spinner"/> : filtered.length === 0 ? (
            <div className="empty-state" style={{gridColumn:'1/-1'}}><div className="emoji">📭</div><h4>No entries found</h4><p>No records match your search.</p></div>
          ) : filtered.map(e => {
            const hasCoords = e.lat && e.lng;
            const osmUrl = hasCoords
              ? `https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lng}#map=16/${e.lat}/${e.lng}`
              : e.address ? `https://www.openstreetmap.org/search?query=${encodeURIComponent((e.name||'')+' '+(e.address||''))}` : null;
            return (
              <div key={e._id} data-testid="info-card" data-id={e._id} className="info-card">
                <div className="info-card-header">
                  <div className={`info-card-icon ${catCls(e.category)}`}>{catIcon(e.category)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="info-card-name">{e.name}</div>
                    {e.area && <div className="info-card-area">📍 {e.area}</div>}
                  </div>
                </div>
                <div className="info-card-phone">📞 <a href={`tel:${e.phone}`}>{e.phone}</a></div>
                <div className="info-card-meta">
                  <span style={{fontFamily:'var(--font-ui)',fontSize:'0.7rem',fontWeight:700,padding:'2px 8px',borderRadius:5,background:e.category==='Ambulance'?'#FFF7ED':e.category==='Blood Bank'?'#FFF1F2':'#EFF6FF',color:e.category==='Ambulance'?'#C2410C':e.category==='Blood Bank'?'#BE123C':'#1D4ED8',border:`1px solid ${e.category==='Ambulance'?'#FED7AA':e.category==='Blood Bank'?'#FECDD3':'#BFDBFE'}`}}>{e.category}</span>
                  {e.available24h && <span className="info-badge-24h">✅ 24 hrs</span>}
                  {hasCoords && <span style={{fontSize:'0.68rem',color:'var(--text3)',fontFamily:'var(--font-ui)'}}>📌 Mapped</span>}
                </div>
                {e.address && <div style={{fontSize:'0.76rem',color:'var(--text2)'}}>🏠 {e.address}</div>}
                {osmUrl && <a href={osmUrl} target="_blank" rel="noopener" style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:'0.75rem',fontFamily:'var(--font-ui)',fontWeight:600,color:'#1D4ED8',textDecoration:'none',marginTop:2}}>🗺 View on OpenStreetMap</a>}
                {e.notes && <div className="info-card-notes">{e.notes}</div>}
                {isAdmin && (
                  <div className="info-card-actions">
                    <button data-testid="info-card-edit-btn" data-id={e._id} className="btn btn-sm btn-outline" onClick={()=>{setEditId(e._id);setFormOpen(true);}}>✏️ Edit</button>
                    <button data-testid="info-card-delete-btn" data-id={e._id} className="btn btn-sm btn-danger" onClick={()=>setDeleteTarget(e)}>🗑</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MAP VIEW */}
      <div id="info-map-view" data-testid="info-map-view" style={{display:view==='map'?'':'none'}}>
        <div className="info-map-layout">
          <div className="info-map-sidebar-col" id="info-map-sidebar" data-testid="info-map-sidebar">
            {filtered.length === 0
              ? <div style={{textAlign:'center',padding:'24px 12px',color:'var(--text3)',fontSize:'0.8rem',fontFamily:'var(--font-ui)'}}>No entries found</div>
              : filtered.map(e => {
                const has = !!(e.lat && e.lng);
                return (
                  <div key={e._id} id={`mapitem-${e._id}`} className={`info-map-item${has?'':' info-map-no-coords'}`} onClick={()=>has&&focusMarker(e)} title={has?'Click to focus on map':'No coordinates — edit to add'}>
                    <div className="info-map-item-name">{catIcon(e.category)} {e.name}</div>
                    {e.area    && <div className="info-map-item-sub">📍 {e.area}</div>}
                    {e.address && <div className="info-map-item-sub" style={{fontSize:'0.7rem'}}>🏠 {e.address}</div>}
                    {e.available24h && <div style={{fontSize:'0.7rem',background:'#EDFBF3',color:'#15803D',border:'1px solid #BBF7D0',borderRadius:5,padding:'2px 8px',display:'inline-block',marginBottom:4}}>✅ Available 24 hours</div>}
                    <div className="info-map-item-phone">📞 {e.phone}</div>
                    {!has && <div style={{fontSize:'0.68rem',color:'var(--text3)',marginTop:3}}>⚠ No map pin — edit to add</div>}
                    {isAdmin && (
                      <div style={{display:'flex',gap:5,marginTop:7}} onClick={e2=>e2.stopPropagation()}>
                        <button data-testid="info-map-edit-btn" data-id={e._id} className="btn btn-sm btn-outline" onClick={()=>{setEditId(e._id);setFormOpen(true);}}>✏️</button>
                        <button data-testid="info-map-delete-btn" data-id={e._id} className="btn btn-sm btn-danger" onClick={()=>setDeleteTarget(e)}>🗑</button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          <div className="info-map-canvas-col">
            <div id="info-map" ref={mapElRef} style={{width:'100%',height:'100%'}}/>
          </div>
        </div>
        {/* Legend */}
        <div style={{display:'flex',gap:16,marginTop:10,flexWrap:'wrap'}}>
          {[['#C8102E','Hospital'],['#EA580C','Ambulance'],['#BE123C','Blood Bank'],['#94A3B8','No location set']].map(([c,l])=>(
            <div key={l} style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.78rem',fontFamily:'var(--font-ui)',color:'var(--text2)'}}>
              <span style={{width:14,height:14,borderRadius:'50%',background:c,display:'inline-block',flexShrink:0,border:'2px solid #fff',boxShadow:`0 0 0 1.5px ${c}`}}/>
              {l}
            </div>
          ))}
          <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'var(--text3)',fontFamily:'var(--font-ui)'}}>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{color:'inherit'}}>OpenStreetMap</a> contributors</span>
        </div>
      </div>

      {formOpen    && <InfoFormModal entryId={editId} onClose={()=>setFormOpen(false)} onSaved={e=>{if(editId)setItems(p=>p.map(x=>x._id===e._id?e:x));else setItems(p=>[e,...p]);setFormOpen(false);showToast('Saved!');}} isAdmin={isAdmin}/>}
      {deleteTarget && <ConfirmModal title="Delete Entry" body={`Delete "${deleteTarget.name}"?`} confirmLabel="Delete" danger onConfirm={doDelete} onCancel={()=>setDeleteTarget(null)}/>}
      {bulkOpen && isAdmin && <InfoBulkModal onClose={()=>setBulkOpen(false)} onDone={()=>{load();showToast('Bulk upload complete!');}}/>}
    </div>
  );
}

// ── Info Form Modal with Nominatim + picker map ───────────────
function InfoFormModal({ entryId, onClose, onSaved, isAdmin }) {
  const { showToast } = useToast();
  const [f, setF]     = useState({ category:'Hospital', name:'', phone:'', area:'', address:'', notes:'', available24h:false, lat:'', lng:'' });
  const [loading, setLoading] = useState(!!entryId);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [dupWarn, setDupWarn] = useState('');
  const [geocodeQ, setGeocodeQ] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const pickerMapRef    = useRef(null);
  const pickerMarkerRef = useRef(null);
  const pickerElRef     = useRef(null);
  const up = (k,v) => setF(p=>({...p,[k]:v}));

  useEffect(() => {
    if (!entryId) return;
    apiFetch('/info/'+entryId).then(res => {
      if (res.success) {
        const e = res.data;
        setF({ category:e.category||'Hospital', name:e.name||'', phone:e.phone||'', area:e.area||'', address:e.address||'', notes:e.notes||'', available24h:!!e.available24h, lat:e.lat?String(e.lat):'', lng:e.lng?String(e.lng):'' });
        setGeocodeQ(e.address||'');
      }
      setLoading(false);
    });
  }, [entryId]);

  // Init picker map after modal mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!pickerElRef.current || !window.L) return;
      if (pickerMapRef.current) { pickerMapRef.current.remove(); pickerMapRef.current = null; pickerMarkerRef.current = null; }
      const lat0 = f.lat ? parseFloat(f.lat) : null;
      const lng0 = f.lng ? parseFloat(f.lng) : null;
      const L = window.L;
      pickerMapRef.current = L.map(pickerElRef.current, { zoomControl: true }).setView([lat0||11.0168, lng0||76.9558], lat0 ? 15 : 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:19 }).addTo(pickerMapRef.current);
      if (lat0 && lng0) {
        pickerMarkerRef.current = L.marker([lat0, lng0], { draggable:true }).addTo(pickerMapRef.current);
        pickerMarkerRef.current.on('dragend', ev => { const p=ev.target.getLatLng(); setCoords(p.lat, p.lng); });
      }
      pickerMapRef.current.on('click', ev => {
        const { lat, lng } = ev.latlng;
        setCoords(lat, lng);
        if (pickerMarkerRef.current) pickerMarkerRef.current.remove();
        pickerMarkerRef.current = L.marker([lat, lng], { draggable:true }).addTo(pickerMapRef.current);
        pickerMarkerRef.current.on('dragend', ev2 => { const p=ev2.target.getLatLng(); setCoords(p.lat, p.lng); });
      });
    }, 250);
    return () => { clearTimeout(timer); pickerMapRef.current?.remove(); pickerMapRef.current = null; };
  }, []);

  function setCoords(lat, lng) {
    setF(p => ({ ...p, lat: parseFloat(lat).toFixed(6), lng: parseFloat(lng).toFixed(6) }));
  }

  function onManualLatLng(lat, lng) {
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (isNaN(la) || isNaN(ln) || !pickerMapRef.current) return;
    const L = window.L;
    pickerMapRef.current.setView([la, ln], 15);
    if (pickerMarkerRef.current) pickerMarkerRef.current.remove();
    pickerMarkerRef.current = L.marker([la, ln], { draggable:true }).addTo(pickerMapRef.current);
    pickerMarkerRef.current.on('dragend', ev => { const p=ev.target.getLatLng(); setCoords(p.lat, p.lng); });
  }

  async function nominatimSearch() {
    const q = geocodeQ.trim();
    if (!q) { showToast('Enter an address to search', 'warn'); return; }
    setGeocoding(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, { headers:{ 'Accept-Language':'en' } });
      const data = await resp.json();
      if (!data.length) { showToast('Address not found — try a broader search', 'warn'); setGeocoding(false); return; }
      const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
      setCoords(lat, lng);
      const L = window.L;
      if (!pickerMapRef.current) { setGeocoding(false); return; }
      pickerMapRef.current.setView([lat, lng], 16);
      if (pickerMarkerRef.current) pickerMarkerRef.current.remove();
      pickerMarkerRef.current = L.marker([lat, lng], { draggable:true }).addTo(pickerMapRef.current);
      pickerMarkerRef.current.on('dragend', ev => { const p=ev.target.getLatLng(); setCoords(p.lat, p.lng); });
    } catch(err) { showToast('Search failed: '+err.message, 'error'); }
    setGeocoding(false);
  }

  async function checkInfoDup() {
    if (entryId) return;
    const name = f.name.trim().toLowerCase(), phone = f.phone.trim();
    if (!name || !phone) return;
    const res = await apiFetch('/info');
    if (!res.success) return;
    const dup = res.data.find(e => e.name.toLowerCase()===name && e.phone.replace(/\s+/g,'')===phone.replace(/\s+/g,''));
    if (dup) setDupWarn(`"${dup.name}" with phone "${dup.phone}" already exists in the ${dup.category} directory.`);
    else setDupWarn('');
  }

  async function save() {
    setError(''); setDupWarn('');
    if (!f.name.trim())  { setError('Name is required.'); return; }
    if (!f.phone.trim()) { setError('Phone is required.'); return; }
    const body = { ...f, lat: f.lat ? parseFloat(f.lat) : undefined, lng: f.lng ? parseFloat(f.lng) : undefined };
    setSaving(true);
    const res = entryId ? await apiFetch('/info/'+entryId,{method:'PUT',body:JSON.stringify(body)}) : await apiFetch('/info',{method:'POST',body:JSON.stringify(body)});
    if (res.success) onSaved(res.data);
    else setError(res.error||'Save failed.');
    setSaving(false);
  }

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><h3 id="info-modal-title">{entryId?'Edit Entry':'Add Entry'}</h3><button id="info-modal-close-btn" className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body" style={{maxHeight:'75vh',overflowY:'auto'}}>
          {loading ? <div className="spinner"/> : (<>
            {dupWarn && <div id="info-dup-warn" style={{background:'#FFF7ED',border:'1.5px solid #FED7AA',borderRadius:10,padding:'12px 16px',marginBottom:14,fontSize:'0.82rem',color:'#92400E',fontFamily:'var(--font-ui)'}}><strong>⚠️ Duplicate Detected</strong><br/><span id="info-dup-msg">{dupWarn}</span></div>}
            {error   && <div style={{background:'#FFF1F2',border:'1.5px solid #FECDD3',color:'#BE123C',borderRadius:9,padding:'9px 14px',marginBottom:12,fontSize:'0.85rem'}}>{error}</div>}

            <div className="form-grid">
              {/* Category first — matches original */}
              <div className="form-group"><label>Category</label>
                <select style={{...FGIS,cursor:'pointer'}} id="info-category" value={f.category} onChange={e=>up('category',e.target.value)}>
                  <option value="Hospital">Hospital</option><option value="Ambulance">Ambulance</option><option value="Blood Bank">Blood Bank</option>
                </select></div>
              <div className="form-group"><label>Name *</label><input style={FGIS} id="info-name" placeholder="e.g. PSG Hospitals" value={f.name} onChange={e=>up('name',e.target.value)} onBlur={checkInfoDup}/></div>
              <div className="form-group"><label>Phone / Helpline *</label><input type="tel" style={FGIS} id="info-phone" placeholder="e.g. +91 98765 43210" value={f.phone} onChange={e=>up('phone',e.target.value)} onBlur={checkInfoDup}/></div>
              <div className="form-group"><label>Area / City</label><input style={FGIS} id="info-area" placeholder="e.g. Coimbatore" value={f.area} onChange={e=>up('area',e.target.value)}/></div>
              <div className="form-group full"><label>Address</label><input style={FGIS} id="info-address" placeholder="Full street address" value={f.address} onChange={e=>up('address',e.target.value)}/></div>
              <div className="form-group full"><label>Notes</label><textarea style={{...FGIS,height:60,resize:'vertical'}} id="info-notes" placeholder="e.g. 24/7 emergency, trauma centre, blood bank on site…" value={f.notes} onChange={e=>up('notes',e.target.value)}/></div>
              {/* Available 24h checkbox */}
              <div className="form-group full" style={{flexDirection:'row',alignItems:'center',gap:10,padding:'6px 0'}}>
                <input type="checkbox" id="info-available24h" checked={f.available24h} onChange={e=>up('available24h',e.target.checked)} style={{width:18,height:18,cursor:'pointer',accentColor:'var(--red)'}}/>
                <label htmlFor="info-available24h" style={{fontFamily:'var(--font-ui)',fontSize:'0.82rem',fontWeight:600,color:'var(--text2)',textTransform:'none',letterSpacing:0,cursor:'pointer'}}>Available 24 hours</label>
              </div>
            </div>

            {/* Map Location section */}
            <div id="info-section-location" className="section-divider" style={{marginTop:8}}>
              📍 Map Location <span style={{fontWeight:400,color:'var(--text3)',fontSize:'0.78rem'}}> — used for map view (OpenStreetMap)</span>
            </div>

            {/* Nominatim search */}
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              <input type="text" id="info-geocode-query" placeholder="Search address on map (e.g. PSG Hospital, Coimbatore)…"
                style={{flex:1,background:'var(--bg3)',border:'1.5px solid var(--border)',borderRadius:'var(--radius-sm)',padding:'9px 12px',color:'var(--text)',fontFamily:'var(--font-body)',fontSize:'0.86rem',outline:'none',transition:'border-color .17s'}}
                value={geocodeQ} onChange={e=>setGeocodeQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),nominatimSearch())}/>
              <button id="info-geocode-search-btn" type="button" className="btn btn-outline btn-sm" onClick={nominatimSearch} style={{whiteSpace:'nowrap',flexShrink:0}} disabled={geocoding}>{geocoding?'Searching…':'🔍 Search'}</button>
            </div>

            {/* Leaflet picker map */}
            <div id="info-picker-map" data-testid="info-picker-map" ref={pickerElRef}
              style={{width:'100%',height:240,borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',overflow:'hidden',position:'relative',marginBottom:10,zIndex:1}}/>
            <div style={{fontSize:'0.72rem',color:'var(--text3)',marginBottom:10}}>
              💡 Click the map to place or move the pin, drag the pin, search an address above, or enter coordinates below.
            </div>

            {/* Manual lat/lng */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div className="form-group"><label>Latitude</label>
                <input type="number" id="info-lat" step="any" placeholder="e.g. 11.0168" style={FGIS} value={f.lat} onChange={e=>{ up('lat',e.target.value); onManualLatLng(e.target.value, f.lng); }}/>
              </div>
              <div className="form-group"><label>Longitude</label>
                <input type="number" id="info-lng" step="any" placeholder="e.g. 76.9558" style={FGIS} value={f.lng} onChange={e=>{ up('lng',e.target.value); onManualLatLng(f.lat, e.target.value); }}/>
              </div>
            </div>
          </>)}
        </div>
        <div className="modal-footer">
          <button id="info-modal-cancel-btn" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" id="save-info-btn" onClick={save} disabled={saving}>{saving?'Saving…':'💾 Save Entry'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Info Bulk Upload Modal ────────────────────────────────────
function InfoBulkModal({ onClose, onDone }) {
  const config = {
    title: 'Bulk Hospital, Ambulance & Blood Bank Upload',
    dataKey: 'entries', endpoint: '/info/bulk', uploadLabel: 'Upload Entries', dropIcon: '🏥',
    cols: ['category','name','phone','area','address','notes','available24h','lat','lng'],
    required: ['category','name','phone'],
    colInfo: [
      {key:'category',note:'Hospital / Ambulance / Blood Bank'},{key:'name',note:'required'},
      {key:'phone',note:'required'},{key:'area',note:'optional (city/district)'},
      {key:'address',note:'optional'},{key:'notes',note:'optional'},
      {key:'available24h',note:'true / false'},{key:'lat',note:'optional (decimal)'},{key:'lng',note:'optional (decimal)'},
    ],
    errorRowKey:'name', errorRowLabel:'Name',
    warnNote:'Rows with missing required fields or invalid category will be skipped.',
    templateFn: ({ utils, writeFile }) => {
      const cols = ['category','name','phone','area','address','notes','available24h','lat','lng'];
      const ws = utils.aoa_to_sheet([cols,
        ['Hospital','PSG Hospitals','+91 422 4345678','Coimbatore','No. 5 Avinashi Rd, Coimbatore','Trauma centre, blood bank on site','true','11.0168','76.9558'],
        ['Ambulance','GVK EMRI (108)','108','Tamil Nadu','','24/7 free ambulance service','true','',''],
        ['Blood Bank','District Blood Bank','+91 422 2300000','Coimbatore','Avinashi Rd, Coimbatore','Licensed blood bank','false','',''],
      ]);
      const wb = utils.book_new(); utils.book_append_sheet(wb, ws, 'Info Directory');
      writeFile(wb, 'HSBlood_InfoDirectory_Template.xlsx');
    },
  };
  return <BulkModal config={config} onClose={onClose} onDone={onDone}/>;
}
