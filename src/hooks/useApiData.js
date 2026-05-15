import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api.js';

/**
 * Tiny data-fetching hook for read endpoints.
 *
 *   const { data, loading, error, reload } = useApiData('/donors');
 *
 * Pass `deps` to refetch when something changes. Pass `enabled: false`
 * to defer the first fetch (useful when waiting on auth).
 */
export function useApiData(url, { enabled = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const aliveRef = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch(url);
    if (!aliveRef.current) return;
    if (res.success) {
      setData(res.data);
    } else {
      setError(res.error || 'Failed to load.');
    }
    setLoading(false);
  }, [url]);

  useEffect(() => {
    aliveRef.current = true;
    if (enabled) reload();
    return () => { aliveRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reload, ...deps]);

  return { data, loading, error, reload, setData };
}
