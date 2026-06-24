import { useState, useRef, useCallback } from 'react';
import { useLivePoll } from './useLivePoll.js';

// Crew status board, synced via /api/status (Upstash Redis), polled in
// near-real-time. Shapes: statuses { [person]: { text, ts } } and the opt-in
// location pins { [person]: { lat, lng, acc, ts } }.
//
// Mirrors usePicks' offline durability: every status write goes into a
// localStorage-backed outbox (person -> desired status, or 'CLEAR') and is
// applied optimistically. Failed writes stay queued (we do NOT revert) and flush
// on reconnect / focus / next poll. Each person only ever writes their own
// status from their own device, so last-write-wins per person is always correct.
//
// Location pins ride a second, single-slot outbox: only the LATEST fix per
// person is worth keeping (it's last-write-wins + server TTL), so a newer fix
// simply overwrites the queued one. Pins are best-effort and deliberately kept
// out of pendingCount, so a GPS refresh never flickers the "N to sync" chip.

const API = '/api/status';
const CACHE_KEY = 'tml2026_status_cache';
const OUTBOX_KEY = 'tml2026_status_outbox';
const LOC_CACHE_KEY = 'tml2026_loc_cache';
const LOC_OUTBOX_KEY = 'tml2026_loc_outbox';
const POLL_MS = 5000;
const IDLE_POLL_MS = 30000;   // back off to this while the app is open but idle
const CLEAR = 'CLEAR';

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
  const [statuses, setStatuses] = useState(() => readJSON(CACHE_KEY, {}));
  const [locations, setLocations] = useState(() => readJSON(LOC_CACHE_KEY, {}));
  const [pendingCount, setPendingCount] = useState(() => readMap(OUTBOX_KEY).size);

  const outboxRef = useRef(readMap(OUTBOX_KEY));
  const locOutboxRef = useRef(readMap(LOC_OUTBOX_KEY));
  const flushingRef = useRef(false);

  const persistOutbox = useCallback(() => {
    try { localStorage.setItem(OUTBOX_KEY, JSON.stringify([...outboxRef.current])); } catch {}
    setPendingCount(outboxRef.current.size);
  }, []);

  const persistLocOutbox = useCallback(() => {
    try { localStorage.setItem(LOC_OUTBOX_KEY, JSON.stringify([...locOutboxRef.current])); } catch {}
  }, []);

  const applyLocal = useCallback((setter, person, pending) => {
    setter(prev => {
      const copy = { ...prev };
      if (pending === CLEAR) delete copy[person];
      else copy[person] = pending;
      return copy;
    });
  }, []);

  // Drain both outboxes; stop on the first failure so we don't hammer a dead
  // network. An entry is only cleared if it hasn't changed since send.
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
          const res = await fetch(API, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) throw new Error('bad status');
          if (outboxRef.current.get(person) === pending) {
            outboxRef.current.delete(person);
            persistOutbox();
          }
        } catch { flushingRef.current = false; return; } // leave queued; retry later
      }
      for (const [person, pending] of [...locOutboxRef.current.entries()]) {
        const body = pending === CLEAR
          ? { action: 'unshare-loc', person }
          : { action: 'location', person, lat: pending.lat, lng: pending.lng, acc: pending.acc };
        try {
          const res = await fetch(API, {
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
  }, [persistOutbox, persistLocOutbox]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error('bad status');
      const { statuses: srvStatus, locations: srvLoc } = await res.json();
      const mergedStatus = applyPending(srvStatus || {}, outboxRef.current);
      const mergedLoc = applyPending(srvLoc || {}, locOutboxRef.current);
      setStatuses(mergedStatus);
      setLocations(mergedLoc);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(mergedStatus));
        localStorage.setItem(LOC_CACHE_KEY, JSON.stringify(mergedLoc));
      } catch {}
      flush();
    } catch {
      // Keep showing whatever we have; retry next poll.
    }
  }, [flush]);

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
    locOutboxRef.current.set(person, pending); // latest fix overwrites any queued one
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

  // Visibility-aware polling with idle back-off — pauses while hidden, full speed
  // while you interact, slower while open-but-idle. Same posture as usePicks.
  useLivePoll(fetchStatuses, { baseMs: POLL_MS, idleMs: IDLE_POLL_MS }, flush);

  return { statuses, locations, setStatus, clearStatus, setLocation, clearLocation, pendingCount };
}
