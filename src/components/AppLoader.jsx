// ──────────────────────────────────────────────────────────────
// App launch loader — same look as the original #app-loader.
// ──────────────────────────────────────────────────────────────
// In the original, this was inline HTML in index.html. We preserve
// the exact SVG markup and keyframes (the latter live in main.css
// — those `@keyframes ldBeat / ldRing1 / ldRing2 / ldEcg / ldDot`
// are inside the original CSS so it Just Works).
//
// If those keyframes ever go missing from main.css, copy them in
// from the original index.html style block.

export default function AppLoader() {
  return (
    <div
      id="app-loader"
      data-testid="app-loader"
      style={{
        position: 'fixed', inset: 0, background: '#FDF5F6',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', zIndex: 9998,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div style={{
          position: 'relative', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          width: 220, height: 220,
        }}>
          <svg
            viewBox="0 0 220 220" width="220" height="220"
            style={{ position: 'absolute', top: 0, left: 0 }} fill="none"
          >
            <circle cx="110" cy="110" r="72" stroke="#F5C0C8"
              style={{ animation: 'ldRing1 2s ease-out infinite' }}/>
            <circle cx="110" cy="110" r="72" stroke="#F5C0C8"
              style={{ animation: 'ldRing2 2s ease-out .5s infinite' }}/>
          </svg>

          <svg viewBox="0 0 200 185" width="186" height="172" fill="none"
            style={{
              position: 'relative', zIndex: 1, transformOrigin: 'center',
              animation: 'ldBeat 1.3s cubic-bezier(.4,0,.2,1) infinite',
            }}
          >
            <defs>
              <radialGradient id="ld-hg" cx="36%" cy="26%" r="70%">
                <stop offset="0%" stopColor="#FF5068"/>
                <stop offset="38%" stopColor="#CC0E28"/>
                <stop offset="100%" stopColor="#780010"/>
              </radialGradient>
              <radialGradient id="ld-s1" cx="33%" cy="22%" r="42%">
                <stop offset="0%" stopColor="rgba(255,255,255,.32)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </radialGradient>
              <radialGradient id="ld-s2" cx="72%" cy="18%" r="28%">
                <stop offset="0%" stopColor="rgba(255,255,255,.14)"/>
                <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
              </radialGradient>
              <radialGradient id="ld-s3" cx="50%" cy="90%" r="40%">
                <stop offset="0%" stopColor="rgba(60,0,8,.5)"/>
                <stop offset="100%" stopColor="rgba(60,0,8,0)"/>
              </radialGradient>
            </defs>
            <path d="M100 175 C100 175 18 128 10 78 C4 44 26 18 52 18 C70 18 86 28 100 46 C114 28 130 18 148 18 C174 18 196 44 190 78 C182 128 100 175 100 175 Z" fill="url(#ld-hg)"/>
            <path d="M100 175 C100 175 18 128 10 78 C4 44 26 18 52 18 C70 18 86 28 100 46 C114 28 130 18 148 18 C174 18 196 44 190 78 C182 128 100 175 100 175 Z" fill="url(#ld-s1)"/>
            <path d="M100 175 C100 175 18 128 10 78 C4 44 26 18 52 18 C70 18 86 28 100 46 C114 28 130 18 148 18 C174 18 196 44 190 78 C182 128 100 175 100 175 Z" fill="url(#ld-s2)"/>
            <path d="M100 175 C100 175 18 128 10 78 C4 44 26 18 52 18 C70 18 86 28 100 46 C114 28 130 18 148 18 C174 18 196 44 190 78 C182 128 100 175 100 175 Z" fill="url(#ld-s3)"/>
            <ellipse cx="66" cy="52" rx="22" ry="14" fill="rgba(255,255,255,.12)" transform="rotate(-30 66 52)"/>
            <ellipse cx="60" cy="46" rx="10" ry="7" fill="rgba(255,255,255,.18)" transform="rotate(-30 60 46)"/>
            <ellipse cx="148" cy="44" rx="10" ry="6" fill="rgba(255,255,255,.08)" transform="rotate(20 148 44)"/>
            <polyline
              points="14,90 34,90 42,90 47,60 52,120 57,68 62,90 78,90 86,90 91,60 96,120 101,68 106,90 122,90 130,90 135,60 140,120 145,68 150,90 186,90"
              stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
              style={{ strokeDasharray: 320, strokeDashoffset: 320, animation: 'ldEcg 2s linear infinite' }}
            />
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '2rem', fontWeight: 700,
            color: '#18213A', lineHeight: 1,
          }}>TN<span style={{ color: '#C8102E' }}>Blood</span></div>
          <div style={{
            fontFamily: "'DM Sans',sans-serif",
            fontSize: '0.78rem', color: '#7A4050',
            marginTop: 8, letterSpacing: '.06em',
          }}>Every drop counts. Saving lives together.</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[0, 0.2, 0.4].map((d, i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#C8102E',
              animation: `ldDot 1.2s ease-in-out ${d}s infinite`,
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}
