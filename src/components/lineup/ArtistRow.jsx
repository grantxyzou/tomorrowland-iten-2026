import { memo } from 'react';
import { Lightning } from '@phosphor-icons/react';
import { STAGES } from '../../data/lineup.js';
import { mono, tmrwGold, raised, hiTop, faint, bodyMuted, ink, muted, rule, clashRed, checkInk, PERSON_COLORS } from './theme.js';
import { timeLabel } from './time.js';

// ── Shared artist row ────────────────────────────────────────
function ArtistRow({ set, myColor, myInk, myPick, others, isClash, showStage, onToggle }) {
  const stageColor = STAGES[set.stage]?.color || tmrwGold;
  const deleted = set.status === 'deleted';

  // Dropped from the lineup — kept visible, struck through, not pickable.
  if (deleted) {
    return (
      <div aria-label={`${set.name}, removed from the lineup`}
        style={{
          minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          padding: '10px 16px', borderTop: `1px solid ${rule}55`, opacity: 0.6,
        }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: muted, letterSpacing: '-0.01em', textDecoration: 'line-through' }}>
            {set.name}
          </span>
        </div>
      </div>
    );
  }

  return (
    <button onClick={onToggle} aria-pressed={myPick} aria-label={`${set.name}, ${set.stage}${set.status === 'new' ? ', newly added' : ''}`}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        padding: '10px 16px', border: 'none', borderTop: `1px solid ${rule}55`,
        backgroundColor: myPick ? raised : 'transparent',
        boxShadow: myPick ? `inset 3px 0 12px -6px ${myColor}99, ${hiTop}` : 'none',
        transition: 'background-color var(--dur-press) var(--ease-out)',
      }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 19, fontWeight: 600, color: myPick ? myColor : ink, letterSpacing: '-0.01em', transition: 'color var(--dur-base) var(--ease-out)' }}>
            {set.name}
          </span>
        </div>
        <div style={{ ...mono, fontSize: 10, color: myPick ? bodyMuted : muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {showStage && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: stageColor, display: 'inline-block' }} />
              <span style={{ color: myPick ? bodyMuted : muted }}>{set.stage}</span>
            </span>
          )}
          <span>{timeLabel(set)}</span>
          {isClash && <span style={{ color: clashRed, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Lightning size={11} weight="fill" /> OVERLAP</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {others.map(p => (
          <span key={p} role="img" aria-label={`${p} also picked this`} title={p} style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: PERSON_COLORS[p], display: 'inline-block' }} />
        ))}
        <span style={{
          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
          border: myPick ? 'none' : `1.5px solid ${faint}`,
          backgroundColor: myPick ? myColor : 'transparent',
        }}>
          {myPick && (
            <svg width="11" height="11" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke={myInk || checkInk} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </span>
      </div>
    </button>
  );
}

// Memoized so a 5s picks-poll or a person-swap only re-renders rows whose
// meaningful props changed. `onToggle` identity is intentionally ignored: it's a
// fresh closure every render, but it only closes over set.id + the active person
// (and a stable togglePick), and any person change already shifts myPick/myColor.
export default memo(ArtistRow, (a, b) =>
  a.set === b.set &&
  a.myPick === b.myPick &&
  a.myColor === b.myColor &&
  a.isClash === b.isClash &&
  a.showStage === b.showStage &&
  a.others.length === b.others.length &&
  a.others.every((p, i) => p === b.others[i])
);
