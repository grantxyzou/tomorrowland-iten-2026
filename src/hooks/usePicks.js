import { useState, useEffect, useRef, useCallback } from 'react';

// Shared picks synced via /api/picks (Upstash Redis), polled in near-real-time.
//
// Shape: { [setId]: { [person]: true } } — same as the old localStorage model,
// so the UI doesn't change. localStorage now only holds a *cache* for instant
// first paint; the server is the source of truth.

const API = '/api/picks';
const CACHE_KEY = 'tml2026_picks_cache';
const POLL_MS = 5000;
const SEP = '|';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}

// Overlay any in-flight (un-acked) local toggles on top of server data so a poll
// landing mid-write can't flicker the user's own change back.
function applyPending(server, pending) {
  const merged = {};
  for (const setId of Object.keys(server || {})) merged[setId] = { ...server[setId] };
  for (const [field, desired] of pending) {
    const i = field.lastIndexOf(SEP);
    const setId = field.slice(0, i);
    const person = field.slice(i + 1);
    if (desired) (merged[setId] ||= {})[person] = true;
    else if (merged[setId]) {
      delete merged[setId][person];
      if (Object.keys(merged[setId]).length === 0) delete merged[setId];
    }
  }
  return merged;
}

export function usePicks() {
  const [picks, setPicks]   = useState(readCache);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  const picksRef   = useRef(picks);
  const pendingRef = useRef(new Map()); // field -> desired boolean (in-flight)
  useEffect(() => { picksRef.current = picks; }, [picks]);

  const fetchPicks = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const { picks: server } = await res.json();
      const merged = applyPending(server, pendingRef.current);
      setPicks(merged);
      setStatus('ready');
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
    } catch {
      // Keep showing whatever we have (cache / last good); retry next poll.
      setStatus(prev => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  const togglePick = useCallback((setId, person) => {
    const field = `${setId}${SEP}${person}`;
    const next = !picksRef.current[setId]?.[person];
    pendingRef.current.set(field, next);

    // Optimistic local update
    setPicks(prev => {
      const set = { ...prev[setId] };
      if (next) set[person] = true; else delete set[person];
      const copy = { ...prev };
      if (Object.keys(set).length) copy[setId] = set; else delete copy[setId];
      return copy;
    });

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId, person, picked: next }),
    })
      .then(res => { if (!res.ok) throw new Error('bad status'); })
      .then(() => { pendingRef.current.delete(field); })
      .catch(() => {
        // Revert the optimistic change on failure.
        pendingRef.current.delete(field);
        setPicks(prev => {
          const set = { ...prev[setId] };
          if (next) delete set[person]; else set[person] = true;
          const copy = { ...prev };
          if (Object.keys(set).length) copy[setId] = set; else delete copy[setId];
          return copy;
        });
      });
  }, []);

  const resetPicks = useCallback(() => {
    pendingRef.current.clear();
    setPicks({});
    try { localStorage.setItem(CACHE_KEY, '{}'); } catch {}
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset', confirm: 'RESET' }),
    }).catch(() => {});
  }, []);

  // Initial load + polling + refetch on tab focus.
  useEffect(() => {
    fetchPicks();
    const id = setInterval(fetchPicks, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchPicks(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', fetchPicks);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fetchPicks);
    };
  }, [fetchPicks]);

  return { picks, status, togglePick, resetPicks };
}
