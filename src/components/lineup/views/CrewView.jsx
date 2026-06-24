import { useState } from 'react';
import { Lightning, Handshake, ChatCircleText, PaperPlaneTilt, X } from '@phosphor-icons/react';
import { PEOPLE, STAGES } from '../../../data/lineup.js';
import { mono, sans, ink, muted, rule, paper, chip, tmrwGold, tmrwBg, shRow, PERSON_COLORS } from '../theme.js';
import { timeLabel } from '../time.js';
import ConflictCombo from '../Overlaps.jsx';

// Quick-send pings — the common "where are you / what's happening" lines so a
// status is one tap, no typing, on a phone in a crowd.
const PRESETS = ['Heading to mainstage', 'Food / drink break', 'Where are you?', 'Meet at our spot'];

// Compact relative time for a status timestamp ("just now" / "4m" / "2h").
function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

// Crew status board — a glanceable "current status" per person, plus a quick
// composer for the active person (preset pings + short free text). Writes go
// through useCrewStatus, which queues them offline and flushes on reconnect.
function CrewStatusBoard({ crewStatus, activePerson, notify }) {
  const { statuses, setStatus, clearStatus, pendingCount } = crewStatus;
  const [text, setText] = useState('');

  const send = (msg) => {
    const clean = msg.trim();
    if (!clean) return;
    setStatus(activePerson, clean);
    setText('');
    notify?.('Status shared with the crew');
  };

  return (
    <div>
      <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <ChatCircleText size={13} weight="bold" /> Crew status
        {pendingCount > 0 && <span style={{ color: tmrwGold, letterSpacing: 0 }}>· sending…</span>}
      </div>

      {/* One row per person — their latest status, colour-coded; "you" can clear it */}
      <section style={{ borderRadius: 13, overflow: 'hidden', backgroundColor: paper, boxShadow: shRow, marginBottom: 10 }}>
        {PEOPLE.map((p, i) => {
          const st = statuses[p];
          const isMe = p === activePerson;
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderTop: i === 0 ? 'none' : `1px solid ${rule}55` }}>
              <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], flexShrink: 0 }} />
              <span style={{ ...sans, fontSize: 13, fontWeight: 700, color: PERSON_COLORS[p], flexShrink: 0, minWidth: 64 }}>{isMe ? `${p} (you)` : p}</span>
              <span style={{ ...sans, fontSize: 14, color: st ? ink : muted, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {st ? st.text : '—'}
              </span>
              {st?.ts && <span style={{ ...mono, fontSize: 10, color: muted, flexShrink: 0 }}>{ago(st.ts)}</span>}
              {isMe && st && (
                <button onClick={() => clearStatus(p)} aria-label="Clear my status"
                  style={{ flexShrink: 0, minWidth: 32, minHeight: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: muted, cursor: 'pointer' }}>
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>
          );
        })}
      </section>

      {/* Composer — preset pings + short free text, posts as the active person */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {PRESETS.map(preset => (
          <button key={preset} onClick={() => send(preset)}
            style={{ minHeight: 36, padding: '0 12px', borderRadius: 30, border: 'none', backgroundColor: chip, color: ink, ...sans, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {preset}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} style={{ display: 'flex', gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={80}
          placeholder={`Share where you are, ${activePerson}…`} aria-label="Your status"
          style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 14px', borderRadius: 11, border: 'none', backgroundColor: chip, color: ink, ...sans, fontSize: 16 }} />
        <button type="submit" disabled={!text.trim()} aria-label="Share status"
          style={{ flexShrink: 0, minHeight: 44, padding: '0 16px', borderRadius: 8, border: 'none', backgroundColor: text.trim() ? PERSON_COLORS[activePerson] : rule, color: tmrwBg, ...sans, fontSize: 14, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <PaperPlaneTilt size={15} weight="fill" /> Share
        </button>
      </form>
    </div>
  );
}

function CrewSection({ title, accent, items, emptyText, showWho }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 10, color: accent, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>{emptyText}</div>
      ) : (
        <section style={{ borderRadius: 13, overflow: 'hidden', backgroundColor: paper, boxShadow: shRow }}>
          {items.map(({ set, pickers }) => {
            const stageColor = STAGES[set.stage]?.color || tmrwGold;
            return (
              <div key={set.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderTop: `1px solid ${rule}55` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 19, fontWeight: 600, color: ink }}>{set.name}</div>
                  <div style={{ ...mono, fontSize: 10, color: muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
                    {set.stage} · {timeLabel(set)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {(showWho ? pickers : []).map(p => (
                    <span key={p} title={p} style={{ ...mono, fontSize: 9, fontWeight: 700, color: tmrwBg, backgroundColor: PERSON_COLORS[p], borderRadius: 3, padding: '2px 5px' }}>{p[0]}</span>
                  ))}
                  {!showWho && PEOPLE.map(p => (
                    <span key={p} title={p} style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

// CREW view — live crew status, per-person totals, the Overlaps section, and
// consensus lists.
export default function CrewView({ crew, totalPicks, clashes, clusters, picks, dayHasTimes, activePerson, myColor, crewStatus, notify }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Live crew status — where is everyone, what's happening */}
      {crewStatus && <CrewStatusBoard crewStatus={crewStatus} activePerson={activePerson} notify={notify} />}
      {/* Per-person totals — colour-filled tags, one per crew member */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PEOPLE.map(person => (
          <div key={person} style={{ flex: 1, minWidth: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderRadius: 8, backgroundColor: PERSON_COLORS[person] }}>
            <span style={{ ...sans, fontSize: 12, fontWeight: 700, color: tmrwBg }}>{person}</span>
            <span style={{ ...mono, fontSize: 14, fontWeight: 700, color: tmrwBg }}>{totalPicks[person]}</span>
          </div>
        ))}
      </div>
      {/* Overlaps — shared picks that land at the same time */}
      <div>
        <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Lightning size={13} weight="bold" /> Overlaps</div>
        {!dayHasTimes ? (
          <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
            No overlaps to flag yet — set times aren’t announced. Shared picks that land at the same time show up here once times drop.
          </div>
        ) : clashes.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>
            No overlaps — none of your shared picks land at the same time.
          </div>
        ) : (
          <ConflictCombo clusters={clusters} picks={picks} me={activePerson} />
        )}
      </div>

      {/* All three */}
      <CrewSection title={`Everyone (${PEOPLE.length}/3)`} accent={myColor} items={crew.all3} emptyText="No artist all three of you picked yet." />
      {/* Two of three */}
      <CrewSection title="Two of you" accent={muted} items={crew.two} emptyText="No two-way overlaps yet." showWho />

      {crew.all3.length === 0 && crew.two.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: muted }}>
          <Handshake size={30} weight="regular" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>Once you’ve each made picks, your overlaps show up here.</div>
        </div>
      )}
    </div>
  );
}
