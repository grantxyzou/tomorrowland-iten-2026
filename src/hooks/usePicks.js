import { useState, useEffect, useRef, useCallback } from 'react';
import { useOnline } from './useOnline.js';
import { useLivePoll } from './useLivePoll.js';
import { apiFetch } from '../lib/api.js';
import { useGroup } from '../groups/GroupContext.jsx';

// Shared picks synced via /api/picks?g=<gid> (Upstash Redis), polled near-real-time.
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
const POLL_MS = 5000;
const IDLE_POLL_MS = 30000;
const SEP = '|';

const cacheKey  = (gid) => `tml2026_picks_cache_${gid}`;
const outboxKey = (gid) => `tml2026_picks_outbox_${gid}`;

function readCache(gid) {
  try { return JSON.parse(localStorage.getItem(cacheKey(gid)) || '{}'); }
  catch { return {}; }
}

function readOutbox(gid) {
  try {
    const arr = JSON.parse(localStorage.getItem(outboxKey(gid)) || '[]');
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
  const { activeGroupId } = useGroup();
  const gid = activeGroupId || 'ldg';

  const [picks, setPicks]   = useState(() => readCache(gid));
  const [status, setStatus] = useState('loading');
  const [pendingCount, setPendingCount] = useState(() => readOutbox(gid).size);
  const [syncing, setSyncing] = useState(false);
  const online = useOnline();

  const picksRef    = useRef(picks);
  const outboxRef   = useRef(readOutbox(gid));
  const flushingRef = useRef(false);
  const prevGidRef  = useRef(gid);

  useEffect(() => { picksRef.current = picks; }, [picks]);

  // Re-initialise local state when the active group changes.
  useEffect(() => {
    if (prevGidRef.current === gid) return;
    prevGidRef.current = gid;
    outboxRef.current = readOutbox(gid);
    setPicks(readCache(gid));
    setPendingCount(outboxRef.current.size);
    setStatus('loading');
  }, [gid]);

  const persistOutbox = useCallback(() => {
    try { localStorage.setItem(outboxKey(gid), JSON.stringify([...outboxRef.current])); } catch {}
    setPendingCount(outboxRef.current.size);
  }, [gid]);

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

  const flush = useCallback(async () => {
    if (flushingRef.current || outboxRef.current.size === 0) return;
    flushingRef.current = true;
    setSyncing(true);
    try {
      for (const [field, desired] of [...outboxRef.current.entries()]) {
        const [setId, person] = splitField(field);
        try {
          const res = await apiFetch(`${API}?g=${gid}`, {
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
          break;
        }
      }
    } finally {
      flushingRef.current = false;
      setSyncing(false);
    }
  }, [gid, persistOutbox]);

  const fetchPicks = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}?g=${gid}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const { picks: server } = await res.json();
      const merged = applyPending(server, outboxRef.current);
      setPicks(merged);
      setStatus('ready');
      try { localStorage.setItem(cacheKey(gid), JSON.stringify(merged)); } catch {}
      flush();
    } catch {
      setStatus(prev => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [gid, flush]);

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

  const clearMine = useCallback((person) => {
    const setIds = Object.keys(picksRef.current).filter(id => picksRef.current[id]?.[person]);
    if (!setIds.length) return [];
    enqueue(setIds.map(id => [fieldOf(id, person), false]));
    return setIds;
  }, [enqueue]);

  const restoreMine = useCallback((person, setIds) => {
    if (!setIds?.length) return;
    enqueue(setIds.map(id => [fieldOf(id, person), true]));
  }, [enqueue]);

  useLivePoll(fetchPicks, { baseMs: POLL_MS, idleMs: IDLE_POLL_MS }, flush);

  return { picks, status, togglePick, clearMine, restoreMine, online, syncing, pendingCount };
}
