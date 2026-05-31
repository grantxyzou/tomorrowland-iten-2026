import React, { useState, useEffect } from 'react';
import { sets, STAGES, PEOPLE, LINEUP_STATUS } from '../data/lineup.js';

const mono = { fontFamily: '"JetBrains Mono", ui-monospace, monospace' };
const sans = { fontFamily: '"Space Grotesk", -apple-system, system-ui, sans-serif' };

// Palette
const tmrwBg    = '#1a0a2e';
const tmrwGold  = '#e8b84b';
const tmrwPanel = 'rgba(13,5,24,0.85)';
const tmrwPanelBorder = 'rgba(232,184,75,0.15)';
const bodyText  = '#f0e8d8';
const bodyMuted = '#b8a888';
const paper     = '#ede7d8';
const ink       = '#1a1614';
const muted     = '#5c544c';
const rule      = '#cabda4';

// Person colours
const PERSON_COLORS = {
  Grant:   '#e8b84b',  // gold
  Des:     '#4a7fc1',  // blue
  Lawrence:'#4a9a4a',  // green
};

const DAYS = [
  { id: 'fri', label: 'Fri 17' },
  { id: 'sat', label: 'Sat 18' },
  { id: 'sun', label: 'Sun 19' },
];

const LS_KEY = 'tml2026_picks';

function loadPicks() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePicks(picks) {
  localStorage.setItem(LS_KEY, JSON.stringify(picks));
}

// picks shape: { [setId]: { Grant: bool, Des: bool, Lawrence: bool } }

export default function LineupTab() {
  const [activeDay, setActiveDay] = useState('fri');
  const [activePerson, setActivePerson] = useState('Grant');
  const [picks, setPicks] = useState(loadPicks);
  const [showClashes, setShowClashes] = useState(false);

  useEffect(() => { savePicks(picks); }, [picks]);

  const daySets = sets.filter(s => s.day === activeDay)
    .sort((a, b) => a.start.localeCompare(b.start));

  function togglePick(setId, person) {
    setPicks(prev => {
      const cur = prev[setId] || {};
      return { ...prev, [setId]: { ...cur, [person]: !cur[person] } };
    });
  }

  // Find clashes: sets where 2+ people have picked AND times overlap
  function getClashes() {
    const clashes = [];
    const daySetsFull = sets.filter(s => s.day === activeDay);
    for (let i = 0; i < daySetsFull.length; i++) {
      for (let j = i + 1; j < daySetsFull.length; j++) {
        const a = daySetsFull[i], b = daySetsFull[j];
        if (a.stage === b.stage) continue;
        if (!timesOverlap(a, b)) continue;
        const aPickers = PEOPLE.filter(p => picks[a.id]?.[p]);
        const bPickers = PEOPLE.filter(p => picks[b.id]?.[p]);
        const shared   = aPickers.filter(p => bPickers.includes(p));
        if (shared.length > 0) {
          clashes.push({ a, b, shared });
        }
      }
    }
    return clashes;
  }

  const clashes = getClashes();
  const clashSetIds = new Set(clashes.flatMap(c => [c.a.id, c.b.id]));

  const totalPicks = PEOPLE.reduce((acc, p) => {
    acc[p] = sets.filter(s => picks[s.id]?.[p]).length;
    return acc;
  }, {});

  return (
    <div style={{ ...sans }}>
      {/* Placeholder notice */}
      {LINEUP_STATUS === 'placeholder' && (
        <div style={{ backgroundColor: tmrwBg, border: `1px dashed ${tmrwGold}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🎵</span>
          <div>
            <div style={{ ...mono, fontSize: 11, color: tmrwGold, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Placeholder Lineup</div>
            <div style={{ fontSize: 12, color: bodyMuted, marginTop: 3, lineHeight: 1.4 }}>
              Official Weekend 1 timetable not yet released. Update <code style={{ ...mono, fontSize: 11, color: tmrwGold }}>src/data/lineup.js</code> when it drops.
            </div>
          </div>
        </div>
      )}

      {/* Person selector */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>Who's picking</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PEOPLE.map(person => {
            const active = activePerson === person;
            const color  = PERSON_COLORS[person];
            return (
              <button
                key={person}
                onClick={() => setActivePerson(person)}
                style={{
                  padding: '6px 16px', borderRadius: 4, border: `2px solid ${color}`,
                  backgroundColor: active ? color : 'transparent',
                  color: active ? ink : color,
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {person}
                <span style={{ ...mono, fontSize: 10, opacity: 0.8 }}>{totalPicks[person]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {DAYS.map(day => {
          const active = activeDay === day.id;
          return (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 4, cursor: 'pointer',
                border: `1px solid ${active ? tmrwGold : rule}`,
                backgroundColor: active ? tmrwBg : 'transparent',
                color: active ? tmrwGold : muted,
                ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                transition: 'all 0.15s',
              }}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      {/* Clash toggle */}
      {clashes.length > 0 && (
        <button
          onClick={() => setShowClashes(o => !o)}
          style={{
            width: '100%', marginBottom: 16, padding: '10px 16px', borderRadius: 6,
            border: '1.5px solid #c94040', backgroundColor: showClashes ? '#c94040' : 'transparent',
            color: showClashes ? '#fff' : '#c94040',
            ...mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          ⚡ {clashes.length} Clash{clashes.length > 1 ? 'es' : ''} — {showClashes ? 'Hide' : 'Show'}
        </button>
      )}

      {/* Clash detail */}
      {showClashes && clashes.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clashes.map((c, i) => (
            <div key={i} style={{ backgroundColor: '#1a0008', border: '1px solid #c94040', borderRadius: 6, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                {c.shared.map(p => (
                  <span key={p} style={{ ...mono, fontSize: 10, fontWeight: 700, color: PERSON_COLORS[p] }}>{p}</span>
                ))}
                <span style={{ fontSize: 10, color: '#c94040' }}>clash</span>
              </div>
              <div style={{ fontSize: 12, color: bodyText }}>{c.a.name} <span style={{ color: '#c94040' }}>vs</span> {c.b.name}</div>
              <div style={{ ...mono, fontSize: 10, color: bodyMuted, marginTop: 2 }}>
                {c.a.start}–{c.a.end} {c.a.stage} · {c.b.start}–{c.b.end} {c.b.stage}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Set list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {daySets.map(set => {
          const myPick      = picks[set.id]?.[activePerson] || false;
          const stageColor  = STAGES[set.stage]?.color || tmrwGold;
          const isClash     = clashSetIds.has(set.id);
          const otherPickers = PEOPLE.filter(p => p !== activePerson && picks[set.id]?.[p]);

          return (
            <button
              key={set.id}
              onClick={() => togglePick(set.id, activePerson)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                borderRadius: 8, padding: '12px 14px',
                border: myPick
                  ? `2px solid ${PERSON_COLORS[activePerson]}`
                  : isClash
                  ? `1.5px solid #c94040`
                  : `1px solid ${rule}`,
                backgroundColor: myPick ? tmrwBg : paper,
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {/* Stage colour bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, backgroundColor: stageColor, borderRadius: '8px 0 0 8px' }} />

              <div style={{ paddingLeft: 10 }}>
                {/* Set name + pick indicator */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: myPick ? tmrwGold : ink, letterSpacing: '-0.01em' }}>
                    {set.name}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {/* Other pickers dots */}
                    {otherPickers.map(p => (
                      <span key={p} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], display: 'inline-block' }} />
                    ))}
                    {/* My pick checkmark */}
                    {myPick && (
                      <span style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: PERSON_COLORS[activePerson], display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage + time */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ ...mono, fontSize: 10, color: stageColor, fontWeight: 700 }}>{set.stage}</span>
                  <span style={{ ...mono, fontSize: 10, color: myPick ? bodyMuted : muted }}>
                    {set.start} – {set.end}
                  </span>
                  {isClash && (
                    <span style={{ ...mono, fontSize: 9, color: '#c94040', fontWeight: 700, letterSpacing: '0.1em' }}>CLASH</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Reset picks */}
      <button
        onClick={() => { setPicks({}); savePicks({}); }}
        style={{ marginTop: 24, width: '100%', padding: '10px', border: `1px solid ${rule}`, borderRadius: 6, background: 'none', color: muted, ...mono, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}
      >
        Reset all picks
      </button>
    </div>
  );
}

function timesOverlap(a, b) {
  const aStart = timeToMin(a.start), aEnd = timeToMin(a.end);
  const bStart = timeToMin(b.start), bEnd = timeToMin(b.end);
  const aE = aEnd <= aStart ? aEnd + 1440 : aEnd;
  const bE = bEnd <= bStart ? bEnd + 1440 : bEnd;
  return aStart < bE && bStart < aE;
}

function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
