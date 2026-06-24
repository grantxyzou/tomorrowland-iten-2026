import { useEffect, useRef } from 'react';

// Visibility-aware, interaction-adaptive poller shared by the live hooks
// (usePicks, useCrewStatus). It pauses entirely while the tab is hidden (a phone
// in your pocket costs nothing) and, while foreground, runs at full speed only
// while you're interacting — backing off when the app is open but idle, so it
// stops waking the radio every few seconds to fetch data that rarely changes.
//
// Mechanics: a cheap `baseMs` JS interval ticks while visible (CPU-only, no
// radio) and GATES the actual network call — it fetches only once per `baseMs`
// when you're active, or once per `idleMs` once you've gone hands-off for
// IDLE_AFTER_MS. The first interaction after idle snaps the next tick back to
// full speed within ≤ baseMs, with no extra wiring. Your own writes are
// unaffected — they post immediately via their own flush path, not this poll.

const IDLE_AFTER_MS = 90_000; // no input for this long ⇒ slow down

// Module-level activity tracker, registered once and shared by every poller.
let lastActivity = Date.now();
function bumpActivity() { lastActivity = Date.now(); }
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll']) {
    window.addEventListener(ev, bumpActivity, { passive: true, capture: true });
  }
}

export function useLivePoll(fetchFn, { baseMs = 5000, idleMs = 30000 } = {}, onOnline) {
  // Refs so a changing fetchFn/onOnline identity doesn't re-arm the timer.
  const fetchRef = useRef(fetchFn);
  const onlineRef = useRef(onOnline);
  useEffect(() => { fetchRef.current = fetchFn; }, [fetchFn]);
  useEffect(() => { onlineRef.current = onOnline; }, [onOnline]);

  useEffect(() => {
    let timer = null;
    let lastFetch = 0;
    const run = () => { lastFetch = Date.now(); fetchRef.current?.(); };
    const tick = () => {
      const idle = Date.now() - lastActivity > IDLE_AFTER_MS;
      const gap = idle ? idleMs : baseMs;
      if (Date.now() - lastFetch >= gap - 250) run();
    };
    const start = () => { if (timer == null) timer = setInterval(tick, baseMs); };
    const stop  = () => { if (timer != null) { clearInterval(timer); timer = null; } };
    const onVisible = () => {
      if (document.visibilityState === 'visible') { run(); start(); }
      else stop();
    };
    const onFocus = () => run();
    const onOnlineEv = () => onlineRef.current?.();

    run();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnlineEv);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnlineEv);
    };
  }, [baseMs, idleMs]);
}
