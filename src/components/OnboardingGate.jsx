import { useState, useRef } from 'react';
import { useGroup } from '../groups/GroupContext.jsx';
import { TomorrowlandMark } from './BrandMarks.jsx';
import { display, sans, mono, ink, muted, tmrwGold, goldLit } from './lineup/theme.js';

const SEEN_KEY = 'tml2026_onboarded';

// A few swipeable full-screen slides. Emoji keeps it light; the last slide's
// button falls through to the crew create/join screen (GroupGate).
const SLIDES = [
  { emoji: '✨', title: 'Welcome to Tomorrowland 2026', body: "Your crew's festival planner — sort out the whole weekend together." },
  { emoji: '🎧', title: 'Pick your DJs', body: 'Browse the lineup by stage and tap to add the sets you love.' },
  { emoji: '📍', title: 'Sync with your crew', body: "See everyone's picks, spot time clashes, and find each other on the map." },
];

// First-run onboarding. Sits between sign-in and the create/join-crew screen:
// shows only for a signed-in user who has no crews yet AND hasn't seen it
// (remembered per-device, mirroring tml2026_tip). Otherwise it's a pass-through.
export default function OnboardingGate({ children }) {
  const { groups, loading } = useGroup();
  const [done, setDone] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  });
  const [slide, setSlide] = useState(0);
  const [dragX, setDragX] = useState(0);
  const drag = useRef({ startX: 0, active: false });

  if (loading || done || groups.length > 0) return children;

  const last = SLIDES.length - 1;
  const go = (i) => setSlide(Math.max(0, Math.min(last, i)));
  const finish = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch {} setDone(true); };

  const onDown = (e) => { drag.current = { startX: e.clientX, active: true }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => { if (drag.current.active) setDragX(e.clientX - drag.current.startX); };
  const onUp = (e) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const dx = e.clientX - drag.current.startX;
    if (dx < -56) go(slide + 1); else if (dx > 56) go(slide - 1);
    setDragX(0);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90, color: ink, ...sans,
      backgroundColor: '#0a0e22',
      backgroundImage: 'radial-gradient(120% 80% at 50% 0%, rgba(120,150,230,0.18), rgba(10,14,34,0) 60%), radial-gradient(120% 90% at 50% 100%, rgba(240,210,120,0.16), rgba(10,14,34,0) 55%)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Skip */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 'calc(env(safe-area-inset-top) + 12px) max(16px, env(safe-area-inset-right)) 0' }}>
        <button type="button" onClick={finish}
          style={{ minHeight: 44, padding: '0 8px', background: 'none', border: 'none', color: muted, ...mono, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Skip
        </button>
      </div>

      {/* Slides — swipe or use the button */}
      <div style={{ flex: 1, overflow: 'hidden', touchAction: 'pan-y' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <div style={{
          display: 'flex', height: '100%',
          transform: `translateX(calc(${-slide * 100}% + ${dragX}px))`,
          transition: drag.current.active ? 'none' : 'transform var(--dur-base) var(--ease-out)',
        }}>
          {SLIDES.map((s, i) => (
            <div key={i} style={{ flex: '0 0 100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px', gap: 16 }}>
              {i === 0 && <TomorrowlandMark color={goldLit} style={{ width: 40, height: 40, marginBottom: 2 }} />}
              <div aria-hidden="true" style={{ fontSize: 46, lineHeight: 1 }}>{s.emoji}</div>
              <h2 style={{ ...display, fontSize: 27, fontWeight: 700, lineHeight: 1.15, margin: 0, color: goldLit, maxWidth: 340 }}>{s.title}</h2>
              <p style={{ ...sans, fontSize: 15, lineHeight: 1.55, margin: 0, color: 'rgba(238,241,251,0.72)', maxWidth: 320 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dots + primary action */}
      <div style={{ padding: '0 24px calc(env(safe-area-inset-bottom) + 28px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <div style={{ display: 'flex', gap: 8 }} aria-hidden="true">
          {SLIDES.map((_, i) => (
            <span key={i} style={{ width: i === slide ? 22 : 7, height: 7, borderRadius: 4, backgroundColor: i === slide ? tmrwGold : 'rgba(255,255,255,0.22)', transition: 'width var(--dur-base) var(--ease-out), background-color var(--dur-base) var(--ease-out)' }} />
          ))}
        </div>
        <button type="button" onClick={() => (slide < last ? go(slide + 1) : finish())}
          style={{ width: '100%', maxWidth: 360, minHeight: 52, borderRadius: 14, border: 'none', backgroundColor: tmrwGold, color: '#1a1614', ...sans, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          {slide < last ? 'Next' : 'Get started'}
        </button>
      </div>
    </div>
  );
}
