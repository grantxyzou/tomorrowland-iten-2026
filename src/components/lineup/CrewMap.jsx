import { NavigationArrow, MapPin, Warning } from '@phosphor-icons/react';
import { PEOPLE } from '../../data/lineup.js';
import {
  mono, sans, ink, muted, caption, faint, paper, chip, raised, rule, clashRed,
  PERSON_COLORS, PERSON_INK, rRow, rPill,
} from './theme.js';
import { haversineMeters, bearingDeg, compass8, fmtDistance } from './geo.js';

// Compact relative time for a fix/status timestamp ("just now" / "4m" / "2h").
function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

// A tiny polar "radar": rings = distance bands, angle = compass bearing, you at
// the centre. Distances are log-scaled so a nearby friend and a far one both
// land on the dial. Pure static SVG — no tiles, no redraw loop, battery-cheap.
function Radar({ me, rels }) {
  const S = 240, c = S / 2, maxR = 104;
  const maxDist = Math.max(1000, ...rels.map(r => r.dist));
  const scale = (d) => (Math.log10(d + 1) / Math.log10(maxDist + 1)) * maxR;
  const ringDists = [maxDist / 8, maxDist / 2, maxDist];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: 280, display: 'block', margin: '4px auto 14px' }} role="img" aria-label="Relative positions of the crew">
      {ringDists.map((d, i) => (
        <g key={i}>
          <circle cx={c} cy={c} r={scale(d)} fill="none" stroke={rule} strokeWidth="1" />
          <text x={c + 3} y={c - scale(d) + 11} fill={caption} style={{ ...mono }} fontSize="8">{fmtDistance(d)}</text>
        </g>
      ))}
      {/* North marker */}
      <text x={c} y="12" fill={faint} textAnchor="middle" style={{ ...mono }} fontSize="9" fontWeight="700">N</text>
      {/* crosshair */}
      <line x1={c} y1={c - maxR} x2={c} y2={c + maxR} stroke={rule} strokeWidth="0.5" />
      <line x1={c - maxR} y1={c} x2={c + maxR} y2={c} stroke={rule} strokeWidth="0.5" />
      {/* others */}
      {rels.map(({ person, dist, bearing }) => {
        const r = scale(dist);
        const t = (bearing * Math.PI) / 180;
        const x = c + r * Math.sin(t), y = c - r * Math.cos(t);
        return (
          <g key={person}>
            <circle cx={x} cy={y} r="7" fill={PERSON_COLORS[person]} />
            <text x={x} y={y + 3} textAnchor="middle" fill={PERSON_INK[person]} style={{ ...sans }} fontSize="8" fontWeight="800">{person[0]}</text>
          </g>
        );
      })}
      {/* you */}
      <circle cx={c} cy={c} r="8" fill={PERSON_COLORS[me]} stroke={paper} strokeWidth="2" />
      <text x={c} y={c + 3} textAnchor="middle" fill={PERSON_INK[me]} style={{ ...sans }} fontSize="8" fontWeight="800">{me[0]}</text>
    </svg>
  );
}

// "Where's everyone" — opt-in GPS relative radar. Shows each crew member as a
// distance + compass bearing from you, plus their latest status. Degrades to a
// status-only board when you (or they) aren't sharing, and works offline off the
// last cached fixes. No basemap, no map tiles.
export default function CrewMap({ me, locations, statuses, sharing, onEnable, onDisable, myFix, error, supported }) {
  const mine = myFix || locations[me] || null;

  // Everyone else who has a live pin, ranked nearest-first when I have a fix.
  const others = PEOPLE.filter(p => p !== me);
  const located = others.filter(p => locations[p]);
  const rels = mine
    ? located.map(p => ({
        person: p,
        dist: haversineMeters(mine, locations[p]),
        bearing: bearingDeg(mine, locations[p]),
        ts: locations[p].ts, acc: locations[p].acc,
      })).sort((a, b) => a.dist - b.dist)
    : [];
  const notSharing = others.filter(p => !locations[p]);

  const errText = {
    denied: 'Location permission denied. Enable it for this site in your browser settings.',
    timeout: "Couldn't get a fix in time — try again with a clearer view of the sky.",
    unavailable: 'Location is unavailable right now.',
    unsupported: "This device or browser doesn't support location.",
  }[error];

  return (
    <div>
      {/* Share toggle — opt-in, off by default */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: rRow, backgroundColor: chip, marginBottom: 12 }}>
        <MapPin size={18} weight="fill" color={sharing ? PERSON_COLORS[me] : muted} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...sans, fontSize: 14, fontWeight: 700, color: ink }}>Share my location</div>
          <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2 }}>
            {sharing ? 'On · updates while this is open' : 'Off · others can’t see you'}
          </div>
        </div>
        <button onClick={sharing ? onDisable : onEnable} disabled={!supported}
          aria-pressed={sharing} aria-label={sharing ? 'Stop sharing my location' : 'Share my location'}
          style={{ flexShrink: 0, minHeight: 40, padding: '0 16px', borderRadius: rPill, border: 'none', cursor: supported ? 'pointer' : 'default',
            backgroundColor: sharing ? raised : PERSON_COLORS[me], color: sharing ? muted : PERSON_INK[me], ...sans, fontSize: 13, fontWeight: 700 }}>
          {sharing ? 'Stop' : 'Share'}
        </button>
      </div>

      {errText && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: rRow, backgroundColor: chip, marginBottom: 12 }}>
          <Warning size={15} weight="fill" color={clashRed} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ ...sans, fontSize: 12, color: clashRed, lineHeight: 1.35 }}>{errText}</span>
        </div>
      )}

      {/* Radar — only meaningful once I have my own fix and someone else is on */}
      {mine && rels.length > 0 && <Radar me={me} rels={rels} />}

      {/* Distances from you */}
      {mine ? (
        rels.length > 0 ? (
          <section style={{ borderRadius: rRow, overflow: 'hidden', backgroundColor: paper, marginBottom: notSharing.length ? 12 : 0 }}>
            {rels.map(({ person, dist, bearing, ts, acc }, i) => (
              <div key={person} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : `1px solid ${rule}55` }}>
                <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: PERSON_COLORS[person], color: PERSON_INK[person], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{person[0]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...sans, fontSize: 15, fontWeight: 700, color: ink }}>
                    {person} · {fmtDistance(dist)} {compass8(bearing)}
                  </div>
                  <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2 }}>
                    {ago(ts)}{acc ? ` · ±${acc} m` : ''}{statuses[person]?.text ? ` · ${statuses[person].text}` : ''}
                  </div>
                </div>
                <NavigationArrow size={16} weight="fill" color={faint} style={{ flexShrink: 0, transform: `rotate(${bearing}deg)` }} />
              </div>
            ))}
          </section>
        ) : (
          <div style={{ ...mono, fontSize: 11, color: muted, padding: '12px 12px', borderRadius: rRow, backgroundColor: paper, marginBottom: notSharing.length ? 12 : 0 }}>
            You’re sharing — nobody else has their location on yet.
          </div>
        )
      ) : (
        <div style={{ ...sans, fontSize: 13, color: sharing ? muted : ink, padding: '14px 12px', borderRadius: rRow, backgroundColor: paper, marginBottom: notSharing.length ? 12 : 0, lineHeight: 1.4 }}>
          {sharing ? 'Getting your location…' : 'Share your location to see how far everyone is and which way they are.'}
        </div>
      )}

      {/* Not sharing — fall back to their status text if any */}
      {notSharing.length > 0 && (
        <div>
          <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 2px 8px' }}>Not sharing</div>
          <section style={{ borderRadius: rRow, overflow: 'hidden', backgroundColor: paper }}>
            {notSharing.map((person, i) => (
              <div key={person} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderTop: i === 0 ? 'none' : `1px solid ${rule}55` }}>
                <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: PERSON_COLORS[person], flexShrink: 0 }} />
                <span style={{ ...sans, fontSize: 14, fontWeight: 700, color: PERSON_COLORS[person], flexShrink: 0, minWidth: 64 }}>{person}</span>
                <span style={{ ...sans, fontSize: 13, color: statuses[person]?.text ? ink : muted, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {statuses[person]?.text || 'location off'}
                </span>
                {statuses[person]?.ts && <span style={{ ...mono, fontSize: 10, color: muted, flexShrink: 0 }}>{ago(statuses[person].ts)}</span>}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
