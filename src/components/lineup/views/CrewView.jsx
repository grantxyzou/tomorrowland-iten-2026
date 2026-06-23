import { Lightning, Handshake } from '@phosphor-icons/react';
import { PEOPLE, STAGES } from '../../../data/lineup.js';
import { mono, sans, ink, muted, rule, paper, tmrwGold, tmrwBg, PERSON_COLORS } from '../theme.js';
import { timeLabel } from '../time.js';
import ConflictCombo from '../Overlaps.jsx';

function CrewSection({ title, accent, items, emptyText, showWho }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 10, color: accent, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ ...mono, fontSize: 11, color: muted, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8 }}>{emptyText}</div>
      ) : (
        <section style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
          {items.map(({ set, pickers }) => {
            const stageColor = STAGES[set.stage]?.color || tmrwGold;
            return (
              <div key={set.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderTop: `1px solid ${rule}55` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ink }}>{set.name}</div>
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

// CREW view — per-person totals, the Overlaps section, and consensus lists.
export default function CrewView({ crew, totalPicks, clashes, clusters, picks, dayHasTimes, activePerson, myColor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
