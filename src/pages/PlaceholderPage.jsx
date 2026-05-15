// ──────────────────────────────────────────────────────────────
// PlaceholderPage — a friendly stub for pages not yet migrated.
// Points the developer at the original module file to port from.
// ──────────────────────────────────────────────────────────────
export default function PlaceholderPage({ title, originalModule }) {
  return (
    <div className="page">
      <div className="page-header">
        <h2>{title} <span>(not migrated yet)</span></h2>
        <p>This page hasn't been ported to React yet.</p>
      </div>
      <div className="card" style={{ maxWidth: 720, margin: '24px auto' }}>
        <div className="card-title">🛠 Migration TODO</div>
        <div style={{ fontFamily: 'var(--font-ui)', color: 'var(--text2)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          <p>
            The behaviour for this page lives in <code>{originalModule}</code> in
            the original project.
          </p>
          <p>
            <strong>How to port it:</strong>
          </p>
          <ol style={{ paddingLeft: 20 }}>
            <li>Open <code>{originalModule}</code> in the original repo.</li>
            <li>Create a new file <code>src/pages/{title.replace(/[^A-Za-z]/g, '')}Page.jsx</code>.</li>
            <li>
              Follow the pattern used in <code>src/pages/Dashboard.jsx</code>:
              <ul style={{ paddingLeft: 18 }}>
                <li><code>useState</code> for data and form fields</li>
                <li><code>useEffect</code> + <code>apiFetch</code> for fetching</li>
                <li><code>useSocketEvent</code> for real-time updates</li>
                <li><code>useAuth</code> for role checks</li>
                <li>Conditional JSX instead of <code>style.display</code> toggles</li>
              </ul>
            </li>
            <li>Replace the route in <code>App.jsx</code>.</li>
          </ol>
          <p>
            See <code>MIGRATION_GUIDE.md</code> at the project root for a
            module-by-module mapping.
          </p>
        </div>
      </div>
    </div>
  );
}
