import { useState, useEffect, useCallback } from 'react';

// Live set-time overrides from /api/lineup, layered onto the bundled lineup at
// runtime (see applyOverrides in lineup/time.js). Read-only on the client: the
// crew publishes corrections out-of-band (a single guarded POST), and every
// phone picks them up here on mount + when the tab regains focus.
//
// OFFLINE-SAFE: we cache the last good overrides in localStorage and start from
// it, so a cold open with no signal still shows the most recent known times. If
// the fetch fails we keep whatever we have; the consumer falls back to bundled
// baseline times when overrides is empty. The service worker's /api/* rule also
// caches the response, so this rarely even has to hit the network.

const API = '/api/lineup';
const CACHE_KEY = 'tml2026_lineup_overrides';
const REVALIDATE_MS = 60000; // overrides change rarely — a slow poll is plenty

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}

export function useLineupOverrides() {
  const [overrides, setOverrides] = useState(readCache);

  const fetchOverrides = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const { overrides: next } = await res.json();
      const value = next && typeof next === 'object' ? next : {};
      setOverrides(value);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch {}
    } catch {
      // Keep the cached overrides; the baseline times stand in either way.
    }
  }, []);

  useEffect(() => {
    let id = null;
    const start = () => { if (id == null) id = setInterval(fetchOverrides, REVALIDATE_MS); };
    const stop  = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVisible = () => {
      if (document.visibilityState === 'visible') { fetchOverrides(); start(); }
      else stop();
    };
    fetchOverrides();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', fetchOverrides);
    window.addEventListener('online', fetchOverrides);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fetchOverrides);
      window.removeEventListener('online', fetchOverrides);
    };
  }, [fetchOverrides]);

  return overrides;
}
