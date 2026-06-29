import { mono, sans, display, paper, chip, ink, bodyMuted, muted, caption, tmrwGold } from '../lineup/theme.js';

// Time-relative agenda (spec §4): HAPPENING NOW + COMING UP for the scrubbed
// minute. Driven entirely by agendaAt(day, minute) — scrubbing updates it live.

function fmtDur(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function AgendaPanel({ agenda }) {
  const { now = [], soon = [], nextAt = null } = agenda || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
      {/* HAPPENING NOW */}
      <div style={{ ...mono, fontSize: 9, letterSpacing: '0.18em', color: tmrwGold, marginTop: 4 }}>HAPPENING NOW</div>
      {now.length === 0 ? (
        <div style={{ background: paper, borderRadius: 12, padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 16, opacity: 0.7 }}>🌙</span>
          <div style={{ ...sans, fontSize: 13, color: bodyMuted }}>
            Nothing scheduled right now{nextAt ? <span style={{ color: muted }}> · next at <strong style={{ color: ink }}>{nextAt}</strong></span> : ''}
          </div>
        </div>
      ) : now.map((a, i) => (
        <div key={i} style={{ background: paper, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: `3px solid ${tmrwGold}` }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: tmrwGold, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...display, fontWeight: 700, fontSize: 15, color: ink, lineHeight: 1.15 }}>{a.label}</div>
            <div style={{ ...mono, fontSize: 9, color: caption, marginTop: 2, letterSpacing: '0.04em' }}>{a.time}</div>
          </div>
          <span style={{ ...mono, fontSize: 9, color: tmrwGold, background: chip, padding: '3px 7px', borderRadius: 4, flexShrink: 0 }}>{fmtDur(a.remaining)} left</span>
        </div>
      ))}

      {/* COMING UP */}
      {soon.length > 0 && (
        <>
          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.18em', color: muted, marginTop: 4 }}>COMING UP</div>
          {soon.map((a, i) => (
            <div key={i} style={{ background: paper, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, opacity: Math.max(0.6, 0.9 - i * 0.08) }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: caption, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...display, fontWeight: 700, fontSize: 15, color: bodyMuted, lineHeight: 1.15 }}>{a.label}</div>
                <div style={{ ...mono, fontSize: 9, color: caption, marginTop: 2, letterSpacing: '0.04em' }}>{a.time}</div>
              </div>
              <span style={{ ...sans, fontSize: 11, color: muted, flexShrink: 0 }}>in {fmtDur(a.inMin)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
