import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { setOnProgress } from '../lib/api.js';

const ProgressContext = createContext(null);

export function ProgressProvider({ children }) {
  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const countRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Wire api.js so apiFetch can drive the bar.
    setOnProgress((delta) => {
      countRef.current = Math.max(0, countRef.current + delta);
      clearTimeout(timerRef.current);
      if (countRef.current > 0) {
        // Start / continue
        setOpacity(1);
        setWidth(30);
        timerRef.current = setTimeout(() => setWidth(70), 300);
      } else {
        // Finish
        setWidth(100);
        timerRef.current = setTimeout(() => {
          setOpacity(0);
          setTimeout(() => setWidth(0), 450);
        }, 200);
      }
    });
  }, []);

  return (
    <ProgressContext.Provider value={null}>
      {/* Same inline style trick as the original #api-bar */}
      <div
        id="api-bar"
        style={{
          position: 'fixed', top: 0, left: 0, height: 3,
          width: `${width}%`, opacity,
          background: 'linear-gradient(90deg,var(--red-dark),var(--red),#FF6B6B)',
          zIndex: 9999,
          transition: 'width .25s ease, opacity .4s ease',
          boxShadow: '0 0 8px rgba(200,16,46,0.5)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() { return useContext(ProgressContext); }
