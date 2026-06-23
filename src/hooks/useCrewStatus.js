import { useState, useEffect, useRef, useCallback } from 'react';

// Crew status board, synced via /api/status (Upstash Redis), polled in
// near-real-time. Shape: { [person]: { text, ts } }.
//
// Mirrors usePicks' offline durability: every write goes into a localStorage-
// backed outbox (person -> desired status, or 'CLEAR') and is applied
// optimistically. Failed writes stay queued (we do NOT revert) and flush on
// reconnect / focus / next poll. Each person only ever writes their own status
// from their own device, so last-write-wins per person is always correct.

const API = '/api/status';
const CACHE_KEY = 'tml2026_status_cache';
const OUTBOX_KEY = 'tml2026_status_outbox';
const POLL_MS = 5000;
const CLEAR = 'CLEAR';

function readCache() {
  try { const v = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; }
  catch { return {}; }
}

function readOutbox() {
  try {
    const arr = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    return new Map(Array.isArray(arr) ? arr : []);
  } catch { return new Map(); }
}

// Overlay queued (un-acked) local writes on top of server data so a poll
// landing mid-write can't flicker the user's own change back.
function applyPending(server, outbox) {
  const merged = { ...(server || {}) };
  for (const [person, pending] of outbox) {
    if (pending === CLEAR) delete merged[person];
    else merged[person] = pending;
  }
  return merged;
}

export function useCrewStatus() {
  const [statuses, setStatuses] = useState(readCache);
  const [pendingCount, setPendingCount] = useState(() => readOutbox().size);

  const outboxRef = useRef(readOutbox());
  const flushingRef = useRef(false);

  const persistOutbox = useCallback(() => {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify([...outboxRef.current])); } catch {}
    setPendingCount(outboxRef.current.size);
  }, []);

  const applyLocal = useCallback((person, pending) => {
    setStatuses(prev => {
      const copy = { ...prev };
      if (pending === CLEAR) delete copy[person];
      else copy[person] = pending;
      return copy;
    });
  }, []);

  // Drain the outbox; stop on the first failure so we don't hammer a dead
  // network. A person's entry is only cleared if it hasn't changed since send.
  const flush = useCallback(async () => {
    if (flushingRef.current || outboxRef.current.size === 0) return;
    flushingRef.current = true;
    try {
      for (const [person, pending] of [...outboxRef.current.entries()]) {
        const body = pending === CLEAR
          ? { action: 'clear', person }
          : { person, text: pending.text };
        try {
          const res = await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error('bad status');
          if (outboxRef.current.get(person) === pending) {
            outboxRef.current.delete(person);
            persistOutbox();
          }
        } catch {
          break; // leave this and the rest queued; retry later
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [persistOutbox]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const { statuses: server } = await res.json();
      const merged = applyPending(server || {}, outboxRef.current);
      setStatuses(merged);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
      flush();
    } catch {
      // Keep showing whatever we have; retry next poll.
    }
  }, [flush]);

  const enqueue = useCallback((person, pending) => {
    outboxRef.current.set(person, pending);
    applyLocal(person, pending);
    persistOutbox();
    flush();
  }, [applyLocal, persistOutbox, flush]);

  const setStatus = useCallback((person, text) => {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!clean) return;
    enqueue(person, { text: clean, ts: Date.now() });
  }, [enqueue]);

  const clearStatus = useCallback((person) => { enqueue(person, CLEAR); }, [enqueue]);

  // Visibility-aware polling — pauses while the tab is hidden, refetches on
  // return. Same battery/network posture as usePicks.
  useEffect(() => {
    let id = null;
    const start = () => { if (id == null) id = setInterval(fetchStatuses, POLL_MS); };
    const stop  = () => { if (id != null) { clearInterval(id); id = null; } };
    const onVisible = () => {
      if (document.visibilityState === 'visible') { fetchStatuses(); start(); }
      else stop();
    };
    fetchStatuses();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', fetchStatuses);
    window.addEventListener('online', flush);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', fetchStatuses);
      window.removeEventListener('online', flush);
    };
  }, [fetchStatuses, flush]);

  return { statuses, setStatus, clearStatus, pendingCount };
}
