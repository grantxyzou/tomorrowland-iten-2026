import { useState } from 'react';
import { MapPin, Warning, Compass } from '@phosphor-icons/react';
import { PEOPLE, STAGES, STAGE_COORDS } from '../../data/lineup.js';
import {
  mono, sans, ink, muted, caption, faint, paper, chip, raised, rule, clashRed, tmrwGold,
  PERSON_COLORS, PERSON_INK, rRow, rPill,
} from './theme.js';
import { haversineMeters, bearingDeg, compass8, fmtDistance, relativeAngle, relLabel } from './geo.js';

// Compact relative time for a fix/status timestamp ("just now" / "4m" / "2h").
function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

const selKey = (t) => t && `${t.kind}:${t.id}`;

// A game-style minimap: you at the centre, everyone + nearby stages plotted by
// real direction and (log-scaled) distance. When a compass heading is live the
// map is HEADING-UP — "up" is the way you're facing and blips rotate as you turn;
// otherwise it falls back to north-up with an N marker. Tapping a blip locks a
// pointer beam onto it. Pure static SVG — no tiles, no redraw loop.
function Minimap({ me, targets, heading, selected, onSelect }) {
  const S = 260, c = S / 2, maxR = 112;
  const headingUp = heading != null;
  const maxDist = Math.max(250, ...targets.map(t => t.dist));
  const scale = (d) => (Math.log10(d + 1) / Math.log10(maxDist + 1)) * maxR;
  const ringDists = [maxDist / 6, maxDist / 2, maxDist];
  // On-screen angle (deg, 0 = up): heading-up rotates by your facing.
  const screenAngle = (bearing) => headingUp ? relativeAngle(bearing, heading) : (bearing % 360);
  const xy = (bearing, r) => {
    const t = (screenAngle(bearing) * Math.PI) / 180;
    return [c + r * Math.sin(t), c - r * Math.cos(t)];
  };
  const sel = targets.find(t => selKey(t) === selKey(selected));

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ maxWidth: 300, display: 'block', margin: '2px auto 12px', touchAction: 'manipulation' }}
      role="img" aria-label="Minimap of the crew and nearby stages">
      {/* distance rings + labels */}
      {ringDists.map((d, i) => (
        <g key={i}>
          <circle cx={c} cy={c} r={scale(d)} fill="none" stroke={rule} strokeWidth="1" />
          <text x={c + 3} y={c - scale(d) + 11} fill={caption} style={{ ...mono }} fontSize="8">{fmtDistance(d)}</text>
        </g>
      ))}
      <line x1={c} y1={c - maxR} x2={c} y2={c + maxR} stroke={rule} strokeWidth="0.5" />
      <line x1={c - maxR} y1={c} x2={c + maxR} y2={c} stroke={rule} strokeWidth="0.5" />

      {/* top indicator — your facing (heading-up) or North (fallback) */}
      {headingUp
        ? <polygon points={`${c},2 ${c - 6},14 ${c + 6},14`} fill={PERSON_COLORS[me]} />
        : <text x={c} y="13" fill={faint} textAnchor="middle" style={{ ...mono }} fontSize="10" fontWeight="700">N</text>}

      {/* locked-on pointer beam to the selected target */}
      {sel && (() => {
        const [bx, by] = xy(sel.bearing, maxR - 6);
        return <line x1={c} y1={c} x2={bx} y2={by} stroke={sel.color} strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />;
      })()}

      {/* targets — stages as diamonds, people as discs */}
      {targets.map((t) => {
        const [x, y] = xy(t.bearing, scale(t.dist));
        const isSel = selKey(t) === selKey(selected);
        return (
          <g key={selKey(t)} onClick={() => onSelect(isSel ? null : t)} style={{ cursor: 'pointer' }}>
            {isSel && <circle cx={x} cy={y} r="13" fill="none" stroke={t.color} strokeWidth="1.5" opacity="0.8" />}
            {t.kind === 'stage' ? (
              <rect x={x - 5.5} y={y - 5.5} width="11" height="11" rx="2" fill={t.color} transform={`rotate(45 ${x} ${y})`} />
            ) : (
              <>
                <circle cx={x} cy={y} r="8" fill={t.color} />
                <text x={x} y={y + 3} textAnchor="middle" fill={t.ink} style={{ ...sans }} fontSize="9" fontWeight="800">{t.label}</text>
              </>
            )}
          </g>
        );
      })}

      {/* you */}
      <circle cx={c} cy={c} r="8.5" fill={PERSON_COLORS[me]} stroke={paper} strokeWidth="2" />
      <text x={c} y={c + 3} textAnchor="middle" fill={PERSON_INK[me]} style={{ ...sans }} fontSize="9" fontWeight="800">{me[0]}</text>
    </svg>
  );
}

// "Where's everyone" — opt-in GPS minimap/compass. Plots crew + nearby stages by
// direction and distance from you; heading-up & tap-to-point when the device
// compass is available, north-up otherwise. Degrades to a status-only board when
// you (or they) aren't sharing, and works offline off the last cached fixes.
export default function CrewMap({
  me, locations, statuses, sharing, onEnable, onDisable, myFix, error, supported,
  heading, compassPermission, headingSupported, nextStage,
}) {
  const [selected, setSelected] = useState(null);
  const [showAllStages, setShowAllStages] = useState(false);
  const mine = myFix || locations[me] || null;

  // Crew with a live pin, ranked nearest-first when I have a fix.
  const others = PEOPLE.filter(p => p !== me);
  const located = others.filter(p => locations[p]);
  const peopleRels = mine
    ? located.map(p => ({
        person: p, dist: haversineMeters(mine, locations[p]), bearing: bearingDeg(mine, locations[p]),
        ts: locations[p].ts, acc: locations[p].acc,
      })).sort((a, b) => a.dist - b.dist)
    : [];
  const notSharing = others.filter(p => !locations[p]);

  // Stages by distance from me. Smart subset: nearest 4 + my next set's stage.
  const stageRels = mine
    ? Object.keys(STAGE_COORDS).map(name => ({
        name, dist: haversineMeters(mine, STAGE_COORDS[name]), bearing: bearingDeg(mine, STAGE_COORDS[name]),
      })).sort((a, b) => a.dist - b.dist)
    : [];
  const subsetNames = new Set([...stageRels.slice(0, 4).map(s => s.name), ...(nextStage ? [nextStage] : [])]);
  const shownStages = showAllStages ? stageRels : stageRels.filter(s => subsetNames.has(s.name));

  // Unified target list for the minimap.
  const targets = [
    ...peopleRels.map(r => ({ kind: 'person', id: r.person, label: r.person[0], color: PERSON_COLORS[r.person], ink: PERSON_INK[r.person], dist: r.dist, bearing: r.bearing })),
    ...shownStages.map(s => ({ kind: 'stage', id: s.name, label: s.name, color: STAGES[s.name]?.color || tmrwGold, dist: s.dist, bearing: s.bearing })),
  ];
  const sel = targets.find(t => selKey(t) === selKey(selected));
  const headingUp = heading != null;
  // Direction phrasing for the readout: relative ("ahead-left") when heading-up,
  // else absolute compass ("NE").
  const dirText = (bearing) => headingUp ? relLabel(relativeAngle(bearing, heading)) : compass8(bearing);

  const errText = {
    denied: 'Location permission denied. Enable it for this site in your browser settings.',
    timeout: "Couldn't get a fix in time — try again with a clearer view of the sky.",
    unavailable: 'Location is unavailable right now.',
    unsupported: "This device or browser doesn't support location.",
  }[error];

  // Note when a heading-up compass isn't available even though we have a fix.
  const compassNote = mine && !headingUp && (
    !headingSupported ? 'Compass not supported — showing north-up.'
    : compassPermission === 'denied' ? 'Compass blocked — showing north-up.'
    : null
  );

  return (
    <div>
      {/* Share toggle — opt-in, off by default. Enabling also asks for the compass. */}
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

      {mine ? (
        <>
          <Minimap me={me} targets={targets} heading={heading} selected={selected} onSelect={setSelected} />

          {/* Locked-on readout (or hint) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: rRow, backgroundColor: sel ? raised : paper, marginBottom: 12, minHeight: 44 }}>
            <Compass size={18} weight="fill" color={sel ? sel.color : muted} style={{ flexShrink: 0 }} />
            {sel ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...sans, fontSize: 15, fontWeight: 700, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sel.id} · {fmtDistance(sel.dist)} {dirText(sel.bearing)}
                </div>
                <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2 }}>
                  {sel.kind === 'stage' ? 'stage · approx.' : (statuses[sel.id]?.text || 'crew')}
                </div>
              </div>
            ) : (
              <span style={{ ...sans, fontSize: 13, color: muted, flex: 1 }}>
                Tap a blip to lock the pointer on it.{compassNote ? ` ${compassNote}` : ''}
              </span>
            )}
          </div>

          {/* People — distance + direction + status */}
          {peopleRels.length > 0 ? (
            <section style={{ borderRadius: rRow, overflow: 'hidden', backgroundColor: paper, marginBottom: 12 }}>
              {peopleRels.map(({ person, dist, bearing, ts, acc }, i) => {
                const isSel = selected?.kind === 'person' && selected.id === person;
                return (
                  <div key={person} onClick={() => setSelected(isSel ? null : { kind: 'person', id: person })}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer', backgroundColor: isSel ? raised : 'transparent', borderTop: i === 0 ? 'none' : `1px solid ${rule}55` }}>
                    <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: PERSON_COLORS[person], color: PERSON_INK[person], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{person[0]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...sans, fontSize: 15, fontWeight: 700, color: ink }}>{person} · {fmtDistance(dist)} {dirText(bearing)}</div>
                      <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2 }}>
                        {ago(ts)}{acc ? ` · ±${acc} m` : ''}{statuses[person]?.text ? ` · ${statuses[person].text}` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : (
            <div style={{ ...mono, fontSize: 11, color: muted, padding: '12px', borderRadius: rRow, backgroundColor: paper, marginBottom: 12 }}>
              You’re sharing — nobody else has their location on yet.
            </div>
          )}

          {/* Stages — nearest few + your next set's stage; tap to point */}
          {shownStages.length > 0 && (
            <div style={{ marginBottom: notSharing.length ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 8px' }}>
                <span style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Stages · approx.</span>
                {stageRels.length > shownStages.length || showAllStages ? (
                  <button onClick={() => setShowAllStages(v => !v)}
                    style={{ border: 'none', background: 'none', color: PERSON_COLORS[me], ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', minHeight: 32, padding: '0 2px' }}>
                    {showAllStages ? 'Show fewer' : 'Show all'}
                  </button>
                ) : null}
              </div>
              <section style={{ borderRadius: rRow, overflow: 'hidden', backgroundColor: paper }}>
                {shownStages.map(({ name, dist, bearing }, i) => {
                  const isSel = selected?.kind === 'stage' && selected.id === name;
                  const color = STAGES[name]?.color || tmrwGold;
                  return (
                    <div key={name} onClick={() => setSelected(isSel ? null : { kind: 'stage', id: name })}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', backgroundColor: isSel ? raised : 'transparent', borderTop: i === 0 ? 'none' : `1px solid ${rule}55` }}>
                      <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 2, transform: 'rotate(45deg)', backgroundColor: color, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, ...sans, fontSize: 14, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}{name === nextStage ? ' · next' : ''}
                      </span>
                      <span style={{ ...mono, fontSize: 11, color: muted, flexShrink: 0 }}>{fmtDistance(dist)} {dirText(bearing)}</span>
                    </div>
                  );
                })}
              </section>
            </div>
          )}
        </>
      ) : (
        <div style={{ ...sans, fontSize: 13, color: sharing ? muted : ink, padding: '14px 12px', borderRadius: rRow, backgroundColor: paper, marginBottom: notSharing.length ? 12 : 0, lineHeight: 1.4 }}>
          {sharing ? 'Getting your location…' : 'Share your location to see the compass — how far everyone (and each stage) is, and which way to go.'}
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
