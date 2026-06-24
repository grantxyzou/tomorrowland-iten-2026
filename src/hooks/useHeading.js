import { useState, useEffect, useRef, useCallback } from 'react';

// Device compass heading for the "Where's everyone" minimap — lets the map turn
// heading-up (so "up" = the way you're facing), like a game minimap.
//
// 0–360° clockwise from true north. On iOS, Safari exposes the corrected
// compass heading directly as event.webkitCompassHeading and gates the sensor
// behind DeviceOrientationEvent.requestPermission() (must be called from a user
// gesture). Elsewhere we derive it from the absolute orientation's `alpha`,
// correcting for the screen rotation. If only a relative sensor exists the value
// still tracks turns but its north may drift — callers treat heading as a hint,
// and everything falls back to north-up when it's unavailable.
//
// Battery: the listener is attached only while `active` (the sheet is open) and
// granted, and re-renders are throttled to whole-degree changes via rAF.

const hasDOE = typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined';
const needsPermission = hasDOE && typeof DeviceOrientationEvent.requestPermission === 'function';

function headingFromEvent(e) {
  // iOS: corrected compass heading, already 0 = N clockwise.
  if (typeof e.webkitCompassHeading === 'number' && !Number.isNaN(e.webkitCompassHeading)) {
    return e.webkitCompassHeading;
  }
  if (typeof e.alpha !== 'number' || Number.isNaN(e.alpha)) return null;
  const screenAngle = (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.angle === 'number')
    ? screen.orientation.angle : (typeof window !== 'undefined' ? (window.orientation || 0) : 0);
  return ((360 - e.alpha) + screenAngle) % 360;
}

export function useHeading({ active }) {
  const [heading, setHeading] = useState(null);
  // 'unknown' | 'granted' | 'denied' | 'unsupported'
  const [permission, setPermission] = useState(hasDOE ? (needsPermission ? 'unknown' : 'granted') : 'unsupported');
  const frame = useRef(0);
  const lastDeg = useRef(null);

  const request = useCallback(async () => {
    if (!hasDOE) { setPermission('unsupported'); return; }
    if (!needsPermission) { setPermission('granted'); return; }
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      setPermission(res === 'granted' ? 'granted' : 'denied');
    } catch {
      setPermission('denied');
    }
  }, []);

  useEffect(() => {
    if (!active || permission !== 'granted') return;
    const onOrient = (e) => {
      const h = headingFromEvent(e);
      if (h == null) return;
      if (frame.current) return; // coalesce to one update per animation frame
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const deg = Math.round(((h % 360) + 360) % 360);
        if (deg !== lastDeg.current) { lastDeg.current = deg; setHeading(deg); }
      });
    };
    // Prefer the absolute event where available; fall back to the generic one.
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', onOrient, true);
      window.removeEventListener('deviceorientation', onOrient, true);
      if (frame.current) { cancelAnimationFrame(frame.current); frame.current = 0; }
    };
  }, [active, permission]);

  // Forget the heading when the sheet closes so a stale value can't show next open.
  useEffect(() => { if (!active) { setHeading(null); lastDeg.current = null; } }, [active]);

  return { heading, request, permission, supported: hasDOE };
}
