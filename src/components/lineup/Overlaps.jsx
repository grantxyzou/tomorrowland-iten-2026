import { useState } from 'react';
import { Lightning, CaretRight } from '@phosphor-icons/react';
import { STAGES, PEOPLE } from '../../data/lineup.js';
import { mono, sans, tmrwGold, tmrwBg, ink, muted, rule, clashRed, PERSON_COLORS } from './theme.js';
import { normSpan, minToLabel } from './time.js';

// ── Overlaps view ────────────────────────────────────────────
// The Crew "Overlaps" section: shared picks that land at the same time, grouped
// into time-window clusters. Collapsed rows list the clashing artists; expanding
// a window reveals a mini Gantt so the overlap is obvious at a glance.

// Small reusable cluster of colour-coded person dots.
export function PersonDots({ people, size = 8 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
      {people.map(p => (
        <span key={p} title={p} aria-label={p} style={{ width: size, height: size, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], display: 'inline-block' }} />
      ))}
    </span>
  );
}

// Mini Gantt body for one cluster — hour ticks + a positioned bar per set,
// shown when an overlap window is expanded.
export function ClusterGantt({ cl, picks }) {
  const [lo, hi] = cl.window;
  const span = Math.max(hi - lo, 1);
  const ticks = [];
  for (let t = Math.ceil(lo / 60) * 60; t <= hi; t += 60) ticks.push(t);
  return (
    <>
      {/* hour grid labels */}
      <div style={{ position: 'relative', height: 12, marginBottom: 2 }}>
        {ticks.map(t => (
          <span key={t} style={{ position: 'absolute', left: `${((t - lo) / span) * 100}%`, transform: 'translateX(-50%)', ...mono, fontSize: 8, color: muted }}>{minToLabel(t)}</span>
        ))}
      </div>
      {cl.sets.map(s => {
        const [st, en] = normSpan(s);
        const left = ((st - lo) / span) * 100;
        const width = Math.max(((en - st) / span) * 100, 6);
        const stageColor = STAGES[s.stage]?.color || tmrwGold;
        const pickers = PEOPLE.filter(p => picks[s.id]?.[p]);
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <PersonDots people={pickers} size={6} />
            <div style={{ position: 'relative', flex: 1, height: 22, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${left}%`, width: `${width}%`, backgroundColor: `${stageColor}33`, borderLeft: `3px solid ${stageColor}`, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 6px' }}>
                <span style={{ ...sans, fontSize: 11, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// The Overlaps view — collapsible per-window rows (time + clashing artist names +
// who's affected); expand a window to reveal its mini Gantt. `me` is the active
// person, highlighted so you spot your own overlaps first.
export default function ConflictCombo({ clusters, picks, me }) {
  const [open, setOpen] = useState(() => new Set());
  const perPerson = PEOPLE.map(p => ({ p, n: clusters.filter(cl => cl.shared.includes(p)).length })).filter(x => x.n > 0);
  const toggle = (i) => setOpen(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next; });
  // First two artist names, then "+N" — readable in one collapsed row.
  const names = (cl) => {
    const ns = cl.sets.map(s => s.name);
    return ns.length <= 2 ? ns.join(', ') : `${ns.slice(0, 2).join(', ')} +${ns.length - 2}`;
  };
  return (
    <div style={{ border: `1px solid ${clashRed}55`, borderRadius: 10, overflow: 'hidden', backgroundColor: tmrwBg }}>
      {/* Header: how many to sort out + who's affected (you, ringed) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', backgroundColor: `${clashRed}14`, borderBottom: `1px solid ${rule}` }}>
        <span style={{ ...sans, fontSize: 13, fontWeight: 700, color: ink, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Lightning size={14} weight="fill" color={clashRed} /> {clusters.length} to resolve</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
          {perPerson.map(({ p, n }) => {
            const isMe = p === me;
            return (
              <span key={p} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, ...mono, fontSize: 10, fontWeight: 700,
                color: isMe ? tmrwBg : PERSON_COLORS[p], backgroundColor: isMe ? PERSON_COLORS[p] : 'transparent',
                borderRadius: 999, padding: isMe ? '2px 7px' : '2px 0',
              }}>
                {!isMe && <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: PERSON_COLORS[p] }} />}
                {isMe ? 'You' : p} {n}
              </span>
            );
          })}
        </span>
      </div>
      {clusters.map((cl, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} style={{ borderTop: i === 0 ? 'none' : `1px solid ${rule}55` }}>
            <button onClick={() => toggle(i)} aria-expanded={isOpen}
              aria-label={`${minToLabel(cl.window[0])} to ${minToLabel(cl.window[1])}: ${cl.sets.map(s => s.name).join(', ')}. Tap to ${isOpen ? 'collapse' : 'expand'}.`}
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', minHeight: 44, border: 'none', background: 'none' }}>
              <CaretRight aria-hidden="true" size={13} weight="bold" color={muted} style={{ flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)' }} />
              <span style={{ ...mono, fontSize: 11, fontWeight: 700, color: ink, flexShrink: 0, whiteSpace: 'nowrap' }}>{minToLabel(cl.window[0])}–{minToLabel(cl.window[1])}</span>
              <span style={{ ...sans, fontSize: 13, fontWeight: 600, color: ink, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{names(cl)}</span>
              <PersonDots people={cl.shared} size={7} />
            </button>
            {isOpen && (
              <div style={{ padding: '6px 12px 12px', borderTop: `1px solid ${rule}33` }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: clashRed, marginBottom: 6 }}>Same time — pick one</div>
                <ClusterGantt cl={cl} picks={picks} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
