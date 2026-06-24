import { useState, useEffect, useRef, useCallback } from 'react';
import { useOnline } from './useOnline.js';
import { useLivePoll } from './useLivePoll.js';
import { apiFetch } from '../lib/api.js';

// Shared picks synced via /api/picks (Upstash Redis), polled in near-real-time.
//
// Shape: { [setId]: { [person]: true } } — same as the old localStorage model,
// so the UI doesn't change. localStorage holds a *cache* for instant first
// paint; the server is the source of truth.
//
// OFFLINE DURABILITY — festival fields have terrible signal, so writes can't
// assume a live connection. Every change goes into a localStorage-backed
// **outbox** (field -> desired boolean) and is applied optimistically. The
// outbox is the retry queue AND the pending-overlay that stops an incoming poll
// from clobbering an un-acked local change. Failed writes stay queued (we do
// NOT revert) and flush automatically on reconnect / focus / next poll. Edits
// survive an app reload because the outbox is persisted. Resolution is simple
// last-write-wins per field, which is correct for a presence toggle.

const API = '/api/picks';
const CACHE_KEY = 'tml2026_picks_cache';
const OUTBOX_KEY = 'tml2026_picks_outbox';
const POLL_MS = 5000;
const IDLE_POLL_MS = 30000;   // back off to this while the app is open but idle
const SEP = '|';

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
  catch { return {}; }
}

function readOutbox() {
  try {
    const arr = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    return new Map(Array.isArray(arr) ? arr : []);
  } catch { return new Map(); }
}

function fieldOf(setId, person) { return `${setId}${SEP}${person}`; }
function splitField(field) {
  const i = field.lastIndexOf(SEP);
  return [field.slice(0, i), field.slice(i + 1)];
}

// Overlay any queued (un-acked) local writes on top of server data so a poll
// landing mid-write can't flicker the user's own change back.
function applyPending(server, outbox) {
  const merged = {};
  for (const setId of Object.keys(server || {})) merged[setId] = { ...server[setId] };
  for (const [field, desired] of outbox) {
    const [setId, person] = splitField(field);
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
  const [pendingCount, setPendingCount] = useState(() => readOutbox().size);
  const [syncing, setSyncing] = useState(false);
  const online = useOnline();

  const picksRef    = useRef(picks);
  const outboxRef   = useRef(readOutbox());   // field -> desired boolean (queued)
  const flushingRef = useRef(false);
  useEffect(() => { picksRef.current = picks; }, [picks]);

  const persistOutbox = useCallback(() => {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify([...outboxRef.current])); } catch {}
    setPendingCount(outboxRef.current.size);
  }, []);

  // Apply a set of field->desired changes to local state, optimistically.
  const applyLocal = useCallback((changes) => {
    setPicks(prev => {
      const copy = {};
      for (const id of Object.keys(prev)) copy[id] = { ...prev[id] };
      for (const [field, desired] of changes) {
        const [setId, person] = splitField(field);
        if (desired) (copy[setId] ||= {})[person] = true;
        else if (copy[setId]) {
          delete copy[setId][person];
          if (!Object.keys(copy[setId]).length) delete copy[setId];
        }
      }
      return copy;
    });
  }, []);

  // Drain the outbox. Stops on the first failure so we don't hammer a dead
  // network with the whole queue — the next trigger (poll/online/focus) retries.
  // A field is only cleared if it hasn't been re-toggled since we sent it.
  const flush = useCallback(async () => {
    if (flushingRef.current || outboxRef.current.size === 0) return;
    flushingRef.current = true;
    setSyncing(true);
    try {
      for (const [field, desired] of [...outboxRef.current.entries()]) {
        const [setId, person] = splitField(field);
        try {
          const res = await apiFetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setId, person, picked: desired }),
          });
          if (!res.ok) throw new Error('bad status');
          if (outboxRef.current.get(field) === desired) {
            outboxRef.current.delete(field);
            persistOutbox();
          }
        } catch {
          break; // leave this and the rest queued; retry later
        }
      }
    } finally {
      flushingRef.current = false;
      setSyncing(false);
    }
  }, [persistOutbox]);

  const fetchPicks = useCallback(async () => {
    try {
      const res = await apiFetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const { picks: server } = await res.json();
      const merged = applyPending(server, outboxRef.current);
      setPicks(merged);
      setStatus('ready');
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
      flush(); // back on the network — drain anything queued
    } catch {
      // Keep showing whatever we have (cache / last good); retry next poll.
      setStatus(prev => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [flush]);

  // Queue one or more field->desired changes: optimistic apply, persist, flush.
  const enqueue = useCallback((changes) => {
    for (const [field, desired] of changes) outboxRef.current.set(field, desired);
    applyLocal(changes);
    persistOutbox();
    flush();
  }, [applyLocal, persistOutbox, flush]);

  const togglePick = useCallback((setId, person) => {
    const field = fieldOf(setId, person);
    const next = !picksRef.current[setId]?.[person];
    enqueue([[field, next]]);
  }, [enqueue]);

  // Clear ALL of one person's picks. Returns the setIds cleared (for undo).
  const clearMine = useCallback((person) => {
    const setIds = Object.keys(picksRef.current).filter(id => picksRef.current[id]?.[person]);
    if (!setIds.length) return [];
    enqueue(setIds.map(id => [fieldOf(id, person), false]));
    return setIds;
  }, [enqueue]);

  // Undo a clear: re-add the person's flags on the given sets.
  const restoreMine = useCallback((person, setIds) => {
    if (!setIds?.length) return;
    enqueue(setIds.map(id => [fieldOf(id, person), true]));
  }, [enqueue]);

  // Initial load + visibility-aware polling with idle back-off. Pauses while the
  // tab is hidden; runs at POLL_MS while you interact and slows to IDLE_POLL_MS
  // once the app is open but idle (saves the radio). `online` drains the outbox.
  useLivePoll(fetchPicks, { baseMs: POLL_MS, idleMs: IDLE_POLL_MS }, flush);

  return { picks, status, togglePick, clearMine, restoreMine, online, syncing, pendingCount };
}
