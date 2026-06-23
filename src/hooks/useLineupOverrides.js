import { useState, useEffect, useCallback } from 'react';

// Live set-time overrides from /api/lineup, layered onto the bundled lineup at
// runtime (see applyOverrides in lineup/time.js). Reads poll on mount + focus;
// the crew can also publish corrections in-app via publish() (a single guarded
// POST), and every phone picks them up on its next poll.
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

  // Publish the full merged override map to the crew. Optimistic: apply locally
  // and cache it first so the editor (and every view) reflect the change at once
  // and it survives a reload, then POST. Returns true on success, false if the
  // server was unreachable — the optimistic local state stands either way and
  // the next poll reconciles. Publishing is a deliberate online action, so we
  // don't queue it offline; the caller just asks the user to retry.
  const publish = useCallback(async (nextOverrides) => {
    const value = nextOverrides && typeof nextOverrides === 'object' ? nextOverrides : {};
    setOverrides(value);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch {}
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'PUBLISH', overrides: value }),
      });
      if (!res.ok) throw new Error('bad status');
      return true;
    } catch {
      return false;
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

  return { overrides, publish };
}
