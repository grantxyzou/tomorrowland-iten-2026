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

  // Set/unset a person's flag on a batch of sets, optimistically, with the
  // pending guard so a mid-flight poll can't undo it. Used by clear + undo.
  const bulkSet = useCallback((person, setIds, desired) => {
    setIds.forEach(id => pendingRef.current.set(`${id}${SEP}${person}`, desired));
    setPicks(prev => {
      const copy = {};
      for (const id of Object.keys(prev)) copy[id] = { ...prev[id] };
      for (const id of setIds) {
        if (desired) (copy[id] ||= {})[person] = true;
        else if (copy[id]) { delete copy[id][person]; if (!Object.keys(copy[id]).length) delete copy[id]; }
      }
      return copy;
    });
  }, []);

  // Clear ALL of one person's picks. Returns the setIds cleared (for undo).
  const clearMine = useCallback((person) => {
    const setIds = Object.keys(picksRef.current).filter(id => picksRef.current[id]?.[person]);
    if (!setIds.length) return [];
    bulkSet(person, setIds, false);
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clearMine', person }),
    })
      .then(r => { if (!r.ok) throw new Error('bad status'); })
      .finally(() => setIds.forEach(id => pendingRef.current.delete(`${id}${SEP}${person}`)));
    return setIds;
  }, [bulkSet]);

  // Undo a clear: re-add the person's flags on the given sets.
  const restoreMine = useCallback((person, setIds) => {
    if (!setIds?.length) return;
    bulkSet(person, setIds, true);
    setIds.forEach(id => {
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: id, person, picked: true }),
      })
        .then(r => { if (!r.ok) throw new Error('bad status'); })
        .finally(() => pendingRef.current.delete(`${id}${SEP}${person}`));
    });
  }, [bulkSet]);

  // Initial load + visibility-aware polling. The 5s poll pauses while the tab is
  // hidden (saves battery + network on a phone in your pocket); on returning we
  // refetch immediately and resume — so it still feels live.
  useEffect(() => {
    let id = null;
    const start = () => { if (id == null) id = setInterval(fetchPicks, POLL_MS); };
    const stop  = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVisible = () => {
      if (document.visibilityState === 'visible') { fetchPicks(); start(); }
      else stop();
    };
    fetchPicks();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', fetchPicks);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fetchPicks);
    };
  }, [fetchPicks]);

  return { picks, status, togglePick, clearMine, restoreMine };
}
