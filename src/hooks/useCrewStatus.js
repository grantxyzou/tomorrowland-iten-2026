import { useState, useRef, useCallback, useEffect } from 'react';
import { useLivePoll } from './useLivePoll.js';
import { apiFetch } from '../lib/api.js';
import { useGroup } from '../groups/GroupContext.jsx';

// Crew status board, synced via /api/status?g=<gid> (Upstash Redis).
//
// Mirrors usePicks' offline durability: every status write goes into a
// localStorage-backed outbox (person -> desired status, or 'CLEAR') and is
// applied optimistically. Failed writes stay queued and flush on reconnect /
// focus / next poll. Each person only ever writes their own status from their
// own device, so last-write-wins per person is always correct.
//
// Location pins ride a second, single-slot outbox: only the LATEST fix per
// person is worth keeping, so a newer fix simply overwrites the queued one.

const API = '/api/status';
const POLL_MS = 5000;
const IDLE_POLL_MS = 30000;
const CLEAR = 'CLEAR';

const statusCacheKey  = (gid) => `tml2026_status_cache_${gid}`;
const statusOutboxKey = (gid) => `tml2026_status_outbox_${gid}`;
const locCacheKey     = (gid) => `tml2026_loc_cache_${gid}`;
const locOutboxKey    = (gid) => `tml2026_loc_outbox_${gid}`;

function readJSON(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v && typeof v === 'object' ? v : fallback; }
  catch { return fallback; }
}

function readMap(key) {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    return new Map(Array.isArray(arr) ? arr : []);
  } catch { return new Map(); }
}

// Overlay queued (un-acked) local writes on top of server data.
function applyPending(server, outbox) {
  const merged = { ...(server || {}) };
  for (const [person, pending] of outbox) {
    if (pending === CLEAR) delete merged[person];
    else merged[person] = pending;
  }
  return merged;
}

export function useCrewStatus() {
  const { activeGroupId } = useGroup();
  const gid = activeGroupId || 'ldg';

  const [statuses,  setStatuses]  = useState(() => readJSON(statusCacheKey(gid), {}));
  const [locations, setLocations] = useState(() => readJSON(locCacheKey(gid), {}));
  const [pendingCount, setPendingCount] = useState(() => readMap(statusOutboxKey(gid)).size);

  const outboxRef    = useRef(readMap(statusOutboxKey(gid)));
  const locOutboxRef = useRef(readMap(locOutboxKey(gid)));
  const flushingRef  = useRef(false);
  const prevGidRef   = useRef(gid);

  // Re-initialise when the active group changes.
  useEffect(() => {
    if (prevGidRef.current === gid) return;
    prevGidRef.current = gid;
    outboxRef.current    = readMap(statusOutboxKey(gid));
    locOutboxRef.current = readMap(locOutboxKey(gid));
    setStatuses(readJSON(statusCacheKey(gid), {}));
    setLocations(readJSON(locCacheKey(gid), {}));
    setPendingCount(outboxRef.current.size);
  }, [gid]);

  const persistOutbox = useCallback(() => {
    try { localStorage.setItem(statusOutboxKey(gid), JSON.stringify([...outboxRef.current])); } catch {}
    setPendingCount(outboxRef.current.size);
  }, [gid]);

  const persistLocOutbox = useCallback(() => {
    try { localStorage.setItem(locOutboxKey(gid), JSON.stringify([...locOutboxRef.current])); } catch {}
  }, [gid]);

  const applyLocal = useCallback((setter, person, pending) => {
    setter(prev => {
      const copy = { ...prev };
      if (pending === CLEAR) delete copy[person];
      else copy[person] = pending;
      return copy;
    });
  }, []);

  const flush = useCallback(async () => {
    if (flushingRef.current) return;
    if (outboxRef.current.size === 0 && locOutboxRef.current.size === 0) return;
    flushingRef.current = true;
    try {
      for (const [person, pending] of [...outboxRef.current.entries()]) {
        const body = pending === CLEAR
          ? { action: 'clear', person }
          : { person, text: pending.text };
        try {
          const res = await apiFetch(`${API}?g=${gid}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error('bad status');
          if (outboxRef.current.get(person) === pending) {
            outboxRef.current.delete(person);
            persistOutbox();
          }
        } catch { flushingRef.current = false; return; }
      }
      for (const [person, pending] of [...locOutboxRef.current.entries()]) {
        const body = pending === CLEAR
          ? { action: 'unshare-loc', person }
          : { action: 'location', person, lat: pending.lat, lng: pending.lng, acc: pending.acc };
        try {
          const res = await apiFetch(`${API}?g=${gid}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error('bad status');
          if (locOutboxRef.current.get(person) === pending) {
            locOutboxRef.current.delete(person);
            persistLocOutbox();
          }
        } catch { break; }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [gid, persistOutbox, persistLocOutbox]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}?g=${gid}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const { statuses: srvStatus, locations: srvLoc } = await res.json();
      const mergedStatus = applyPending(srvStatus || {}, outboxRef.current);
      const mergedLoc    = applyPending(srvLoc    || {}, locOutboxRef.current);
      setStatuses(mergedStatus);
      setLocations(mergedLoc);
      try {
        localStorage.setItem(statusCacheKey(gid), JSON.stringify(mergedStatus));
        localStorage.setItem(locCacheKey(gid),    JSON.stringify(mergedLoc));
      } catch {}
      flush();
    } catch {}
  }, [gid, flush]);

  const setStatus = useCallback((person, text) => {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!clean) return;
    const pending = { text: clean, ts: Date.now() };
    outboxRef.current.set(person, pending);
    applyLocal(setStatuses, person, pending);
    persistOutbox();
    flush();
  }, [applyLocal, persistOutbox, flush]);

  const clearStatus = useCallback((person) => {
    outboxRef.current.set(person, CLEAR);
    applyLocal(setStatuses, person, CLEAR);
    persistOutbox();
    flush();
  }, [applyLocal, persistOutbox, flush]);

  const setLocation = useCallback((person, fix) => {
    const lat = Number(fix?.lat), lng = Number(fix?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const acc = Number.isFinite(Number(fix?.acc)) ? Math.round(Number(fix.acc)) : null;
    const pending = { lat, lng, acc, ts: Date.now() };
    locOutboxRef.current.set(person, pending);
    applyLocal(setLocations, person, pending);
    persistLocOutbox();
    flush();
  }, [applyLocal, persistLocOutbox, flush]);

  const clearLocation = useCallback((person) => {
    locOutboxRef.current.set(person, CLEAR);
    applyLocal(setLocations, person, CLEAR);
    persistLocOutbox();
    flush();
  }, [applyLocal, persistLocOutbox, flush]);

  useLivePoll(fetchStatuses, { baseMs: POLL_MS, idleMs: IDLE_POLL_MS }, flush);

  return { statuses, locations, setStatus, clearStatus, setLocation, clearLocation, pendingCount };
}
