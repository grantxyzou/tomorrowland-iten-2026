import { useState, useEffect, useRef, useCallback } from 'react';

// Opt-in, battery-conscious location sharing for the "Where's everyone" radar.
//
// The big battery lever at a festival isn't the display — it's the sampling
// strategy. So we deliberately AVOID navigator.geolocation.watchPosition (a
// continuous high-accuracy lock that drains phones) and instead take coarse,
// throttled one-shot fixes with enableHighAccuracy:false — the device uses
// wifi/cell triangulation rather than spinning up the GPS chip. We sample only
// while `active` (the map sheet is open): one fix on open, then every ~90s.
// Closing the sheet stops sampling entirely. The trade-off, by design: your pin
// refreshes while you're looking at the map, not in the background. Others still
// see your last fix until the server's ~4h TTL expires it.
//
// Sharing is opt-in (persisted) and off by default; with it off we make ZERO
// geolocation calls. Each fix is pushed via setLocation (queued + synced by
// useCrewStatus); disabling clears your pin.

const SHARE_KEY = 'tml2026_geo_share';
const SAMPLE_MS = 90_000;
const GEO_OPTS = { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 };

const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

export function useGeoShare({ me, active, setLocation, clearLocation }) {
  const [sharing, setSharing] = useState(() => {
    try { return localStorage.getItem(SHARE_KEY) === '1'; } catch { return false; }
  });
  const [myFix, setMyFix] = useState(null);   // { lat, lng, acc, ts }
  const [error, setError] = useState(null);    // 'denied' | 'unavailable' | 'timeout' | 'unsupported'
  const timerRef = useRef(null);

  // One coarse fix → publish it as this person's pin.
  const sampleOnce = useCallback(() => {
    if (!supported) { setError('unsupported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, ts: Date.now() };
        setMyFix(fix);
        setError(null);
        setLocation?.(me, fix);
      },
      (err) => {
        setError(err.code === 1 ? 'denied' : err.code === 3 ? 'timeout' : 'unavailable');
      },
      GEO_OPTS,
    );
  }, [me, setLocation]);

  const enable = useCallback(() => {
    if (!supported) { setError('unsupported'); return; }
    setError(null);
    setSharing(true);
    try { localStorage.setItem(SHARE_KEY, '1'); } catch {}
    sampleOnce(); // immediate fix on opt-in (also surfaces the permission prompt)
  }, [sampleOnce]);

  const disable = useCallback(() => {
    setSharing(false);
    setMyFix(null);
    try { localStorage.setItem(SHARE_KEY, '0'); } catch {}
    clearLocation?.(me); // drop my pin server-side
  }, [me, clearLocation]);

  // Sample only while sharing AND the sheet is open: one fix now, then on a
  // gentle interval. Tearing down on close/disable stops all sampling.
  useEffect(() => {
    if (!sharing || !active) return;
    sampleOnce();
    timerRef.current = setInterval(sampleOnce, SAMPLE_MS);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [sharing, active, sampleOnce]);

  return { sharing, enable, disable, myFix, error, supported };
}
