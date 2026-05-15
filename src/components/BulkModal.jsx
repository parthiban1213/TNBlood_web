import { useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

async function getXLSX() {
  return import('https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs').catch(() => ({ utils: null, writeFile: null, read: null }));
}

export default function BulkModal({ config, onClose, onDone }) {
  /**
   * config = {
   *   title, icon, endpoint, dataKey,
   *   cols: ['col1','col2',...],
   *   required: ['col1','col2'],
   *   colInfo: [{key, label, note}],  // for the column guide
   *   dropIcon, dropLabel,
   *   errorRowKey, errorRowLabel,
   *   templateFn, templateName,
   *   warnNote,
   * }
   */
  const { showToast } = useToast();
  const [step,      setStep]      = useState(1);
  const [rows,      setRows]      = useState([]);
  const [fileName,  setFileName]  = useState('');
  const [uploading, setUploading] = useState(false);
  const [result,    setResult]    = useState(null);

  function reset() { setStep(1); setRows([]); setFileName(''); setResult(null); }

  async function processFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { showToast('Please select an .xlsx or .xls file.', 'error'); return; }
    setFileName('📁 ' + file.name);
    const reader = new FileReader();
    reader.onload = async e => {
      const { read, utils } = await getXLSX();
      if (!read) { showToast('XLSX library unavailable.', 'error'); return; }
      try {
        const wb   = read(new Uint8Array(e.target.result), { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = utils.sheet_to_json(ws, { defval: '' });
        if (!data.length) { showToast('The file appears to be empty.', 'error'); return; }
        setRows(data); setStep(2);
      } catch(err) { showToast('Failed to parse file: ' + err.message, 'error'); }
    };
    reader.readAsArrayBuffer(file);
  }

  async function confirm() {
    if (!rows.length) return;
    setUploading(true);
    const body = { [config.dataKey]: rows };
    const res  = await apiFetch(config.endpoint, { method: 'POST', body: JSON.stringify(body) });
    setResult(res); setStep(3);
    if (res.success) onDone?.();
    setUploading(false);
  }

  async function downloadTemplate() {
    if (!config.templateFn) return;
    const xlsx = await getXLSX();
    if (!xlsx.utils) { showToast('XLSX library unavailable.', 'error'); return; }
    config.templateFn(xlsx);
  }

  const d = result?.data || {};
  const allOk = d.skipped === 0;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700, width: '95%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📥 {config.title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div>
            <div style={{ background: 'var(--red-light)', border: '1px solid rgba(200,16,46,0.15)', borderRadius: 10, padding: 16, marginBottom: 18 }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--red)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>📋 Required Excel Columns</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                {config.colInfo.map(col => (
                  <p key={col.key} style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>
                    <strong>{col.key}</strong>{col.note ? ' — ' + col.note : ''}
                  </p>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <button className="btn btn-outline" onClick={downloadTemplate} style={{ fontSize: '0.8rem' }} type="button">⬇️ Download Template</button>
            </div>

            <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all .2s', background: 'var(--bg3)' }}
              onClick={() => document.getElementById('bulk-file-' + config.dataKey).click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)'; }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)'; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg3)'; const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
            >
              <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>{config.dropIcon || '📊'}</div>
              <p style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Drop your Excel file here</p>
              <p style={{ fontSize: '0.76rem', color: 'var(--text3)', marginTop: 4 }}>or click to browse — .xlsx / .xls files only</p>
              <input type="file" id={'bulk-file-' + config.dataKey} accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) processFile(f); }}/>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--red)', marginTop: 8, fontFamily: 'var(--font-ui)', fontWeight: 700, minHeight: 18 }}>{fileName}</p>
          </div>
        )}

        {/* Step 2 — preview */}
        {step === 2 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <button className="btn btn-outline" onClick={reset} style={{ fontSize: '0.78rem', padding: '6px 14px' }} type="button">← Back</button>
              <p style={{ fontSize: '0.82rem', color: 'var(--text2)', fontFamily: 'var(--font-ui)' }}>
                <strong>{rows.length} row{rows.length !== 1 ? 's' : ''} found</strong>{rows.length > 50 ? ' (showing first 50)' : ''}
              </p>
            </div>
            <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead style={{ background: 'var(--bg3)', position: 'sticky', top: 0 }}>
                  <tr>{config.cols.map(c => <th key={c} style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'var(--font-ui)', fontSize: '0.72rem', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '' : 'var(--bg3)' }}>
                      {config.cols.map(col => {
                        const val     = row[col] !== undefined ? String(row[col]) : '';
                        const missing = !val && config.required.includes(col);
                        return <td key={col} style={{ padding: '7px 10px', borderTop: '1px solid var(--border2)', color: missing ? '#C8102E' : 'inherit', fontWeight: missing ? 700 : 'inherit' }}>{val || (missing ? '⚠ missing' : '—')}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {config.warnNote && <p style={{ fontSize: '0.73rem', color: 'var(--text3)', marginTop: 8 }}>⚠️ {config.warnNote}</p>}
          </div>
        )}

        {/* Step 3 — result */}
        {step === 3 && result && (
          <div>
            <div style={{ borderRadius: 10, padding: 20, marginBottom: 16, background: allOk ? '#edfaf4' : '#fff9ec', border: '1px solid ' + (allOk ? '#52c982' : '#f0ad4e') }}>
              <p style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: '1rem', color: allOk ? '#1a7a46' : '#856404', marginBottom: 10 }}>
                {allOk ? '✅ Upload Complete!' : '⚠️ Upload Complete with Issues'}
              </p>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                <div><span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1a7a46' }}>{d.inserted || 0}</span><p style={{ fontSize: '0.75rem', color: 'var(--text2)', fontFamily: 'var(--font-ui)' }}>Inserted</p></div>
                <div><span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#856404' }}>{d.skipped || 0}</span><p style={{ fontSize: '0.75rem', color: 'var(--text2)', fontFamily: 'var(--font-ui)' }}>Rows Skipped</p></div>
              </div>
            </div>
            {d.errors?.length > 0 && (
              <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead style={{ background: 'var(--bg3)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-ui)' }}>Row</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-ui)' }}>{config.errorRowLabel || 'Identifier'}</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--font-ui)' }}>Reason Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.errors.map((err, i) => (
                      <tr key={i}>
                        <td style={{ padding: '7px 12px', borderTop: '1px solid var(--border2)' }}>{err.row}</td>
                        <td style={{ padding: '7px 12px', borderTop: '1px solid var(--border2)' }}>{err[config.errorRowKey] || '—'}</td>
                        <td style={{ padding: '7px 12px', borderTop: '1px solid var(--border2)', color: '#856404' }}>{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="modal-footer">
          {step < 3 && <button className="btn btn-outline" onClick={onClose} type="button">Cancel</button>}
          {step === 2 && <button className="btn btn-primary" onClick={confirm} disabled={uploading} type="button">{uploading ? '⏳ Uploading…' : `🚀 ${config.uploadLabel || 'Upload'}`}</button>}
          {step === 3 && <button className="btn btn-primary" onClick={result?.success ? () => { onDone?.(); onClose(); } : onClose} type="button">{result?.success ? '✅ Done' : 'Close'}</button>}
        </div>
      </div>
    </div>
  );
}
