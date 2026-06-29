import { skyGradient, celestial, skyMode } from './sky.js';
import { minToLabel } from '../lineup/time.js';
import { display, mono } from '../lineup/theme.js';

// Full-bleed sky for the Itinerary tab. Everything here is a function of one
// number — `minute` (the effective minute of day, live or scrubbed). The sky
// never affects legibility: an always-on bottom scrim keeps text white-on-dark
// regardless of the gradient behind it (spec §2-C).
//
// No continuous animation: the gradient is recomputed per render (every 30s in
// live mode, or on each scrub frame), so prefers-reduced-motion needs no special
// case — there is nothing tweening.
// Days until departure (null if no date). Inclusive ceil so "today" reads 0.
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const dep = new Date(dateStr); if (Number.isNaN(dep.getTime())) return null;
  dep.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((dep - today) / 86_400_000);
}

export default function SkyHeader({ minute, dayLabel, nextLabel, outdoor = false, kicker, crewName, departureDate }) {
  // Outdoor mode (§6): fixed midday-blue sky for daylight legibility, regardless
  // of the real time. The displayed clock still shows the actual/scrubbed minute.
  const skyMin = outdoor ? 720 : minute;
  const { top, bottom } = skyGradient(skyMin);
  const body = celestial(skyMin);
  const mode = skyMode(skyMin);

  // Map the arc's peak (0 horizon → 1 zenith) into the drawable band.
  const yPct = 92 - body.peak * 74;

  const meta = [dayLabel, nextLabel && `NEXT: ${nextLabel}`].filter(Boolean).join(' · ');

  const d = daysUntil(departureDate);
  const countdown = d == null ? null : d > 0 ? `${d} ${d === 1 ? 'DAY' : 'DAYS'}` : d === 0 ? 'TODAY' : 'UNDERWAY';

  return (
    <div style={{
      position: 'relative', height: 150, overflow: 'hidden',
      background: `linear-gradient(to bottom, ${top}, ${bottom})`,
    }}>
      {/* Celestial arc + body */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <path d="M 5 92 Q 50 4 95 92" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2 2" />
      </svg>
      {/* Body drawn in its own non-stretched layer so the glow stays circular */}
      <div aria-hidden="true" style={{
        position: 'absolute', left: `${body.xPct}%`, top: `${yPct}%`,
        width: body.isSun ? 20 : 14, height: body.isSun ? 20 : 14,
        marginLeft: body.isSun ? -10 : -7, marginTop: body.isSun ? -10 : -7,
        borderRadius: '50%', background: body.color,
        boxShadow: `0 0 ${body.isSun ? 22 : 14}px ${body.glow}`,
        opacity: body.isSun ? 1 : 0.85,
      }} />

      {/* Horizon glow + scrims (top + bottom) — text legibility is independent of
          the sky. The top scrim keeps the kicker/crew/countdown readable. */}
      <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, background: 'linear-gradient(to bottom, rgba(0,0,0,0.38), transparent)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50, background: 'linear-gradient(to top, rgba(0,0,0,0.30), transparent)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.52), transparent 60%)' }} />

      {/* Top overlay — kicker + crew (left) and countdown (right): the sky is the
          page header now, so it carries what used to be the dark masthead bar. */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '11px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          {kicker && (
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>{kicker}</div>
          )}
          {crewName && (
            <div style={{ ...display, fontSize: 15, fontWeight: 700, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{crewName}</div>
          )}
        </div>
        {countdown && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ ...mono, fontSize: 8, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>DEPARTURE IN</div>
            <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.55)', marginTop: 1 }}>{countdown}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          {meta && (
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 4px rgba(0,0,0,0.7)', marginBottom: 3 }}>
              {meta}
            </div>
          )}
          <div style={{ ...display, fontWeight: 700, fontSize: 38, lineHeight: 1, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}>
            {minToLabel(minute)}
          </div>
        </div>
        <div style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
          {mode}
        </div>
      </div>
    </div>
  );
}
