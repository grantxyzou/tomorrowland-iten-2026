import { Moon, Lightning, Sparkle, CaretDown } from '@phosphor-icons/react';
import { bar, paper, ink, muted, tmrwGold, goldLit, inkOnGold, glowGold, mono, sans, PERSON_COLORS, DAYS, VIEWS } from './theme.js';

// Dark ink that clears AA on each crew member's bright avatar hue.
const AVATAR_INK = { Grant: '#1a1505', Desmond: '#11131c', Lawrence: '#06210a' };

// The Trip Bar — persistent bottom control bar (Trip Bar spec). Person · Day ·
// View live in the thumb zone and never move; only the content above swaps. A
// morphing floating action button sits just above the bar, bound to the view.
export default function TripBar({
  activePerson, activeDay, view, setView, party, crewCount, clashCount, nextClashLabel,
  onPerson, onDay, onParty, onResolve, onNudge,
}) {
  const myColor = PERSON_COLORS[activePerson];
  const dayLabel = DAYS.find(d => d.id === activeDay)?.label || '';

  // Floating action — bound to the active view; only one ever shows.
  let fab = null;
  if ((view === 'stage' || view === 'time') && clashCount > 0) {
    fab = {
      label: view === 'stage' ? `${clashCount} clash${clashCount === 1 ? '' : 'es'} · resolve` : `next clash · ${nextClashLabel}`,
      icon: <Lightning size={15} weight="fill" />, bg: '#e8554e', fg: '#fff',
      glow: '0 10px 24px rgba(232,85,78,0.40)', onClick: onResolve,
      aria: view === 'stage' ? `${clashCount} overlaps — resolve` : `Next overlap at ${nextClashLabel} — resolve`,
    };
  } else if (view === 'crew') {
    fab = {
      label: 'nudge squad', icon: <Sparkle size={15} weight="fill" />, bg: tmrwGold, fg: inkOnGold,
      glow: '0 10px 24px rgba(233,185,73,0.35)', onClick: onNudge, aria: 'Nudge the squad',
    };
  }

  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 13px',
    borderRadius: 30, backgroundColor: paper, border: '1px solid #243056', color: ink,
    ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  };

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, pointerEvents: 'none' }}>
      {/* Floating action above the bar */}
      {fab && (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px 12px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={fab.onClick} aria-label={fab.aria}
            style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 44, padding: '0 18px', borderRadius: 22, border: 'none', backgroundColor: fab.bg, color: fab.fg, ...sans, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: fab.glow }}>
            {fab.icon} {fab.label}
          </button>
        </div>
      )}

      {/* The bar */}
      <div style={{ pointerEvents: 'auto', backgroundColor: bar, borderTop: '1px solid #20284a', borderTopLeftRadius: 30, borderTopRightRadius: 30, boxShadow: '0 -12px 30px rgba(0,0,0,0.45)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Row 1 — Person · Day · Party */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <button onClick={onPerson} aria-haspopup="dialog" aria-label={`Whose plan: ${activePerson}. Tap to switch.`} style={chipStyle}>
              <span aria-hidden="true" style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: myColor, color: AVATAR_INK[activePerson] || '#0a0e22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{activePerson[0]}</span>
              <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activePerson}</span>
              <CaretDown size={13} weight="bold" color={muted} />
            </button>
            <button onClick={onDay} aria-haspopup="dialog" aria-label={`Day: ${dayLabel}. Tap to switch.`} style={{ ...chipStyle, ...mono, fontSize: 13 }}>
              <span style={{ color: goldLit, fontWeight: 700 }}>{dayLabel}</span>
              <CaretDown size={13} weight="bold" color={muted} />
            </button>
            <button onClick={onParty} aria-pressed={party} aria-label="Enter party mode"
              style={{ marginLeft: 'auto', flexShrink: 0, width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: party ? 'none' : '1px solid #243056', cursor: 'pointer', backgroundColor: party ? tmrwGold : paper, color: party ? inkOnGold : tmrwGold, boxShadow: party ? glowGold : 'none' }}>
              <Moon size={18} weight="fill" />
            </button>
          </div>

          {/* Row 2 — View switch (one active) */}
          <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 6, padding: 5, borderRadius: 16, backgroundColor: '#080c1e' }}>
            {VIEWS.map(v => {
              const active = view === v.id;
              const label = v.label + (v.id === 'crew' && crewCount > 0 ? ` · ${crewCount}` : '');
              return (
                <button key={v.id} role="tab" aria-selected={active} onClick={() => setView(v.id)}
                  style={{ flex: 1, minHeight: 44, borderRadius: 11, border: 'none', cursor: 'pointer', backgroundColor: active ? tmrwGold : 'transparent', color: active ? inkOnGold : muted, ...sans, fontSize: 14, fontWeight: active ? 700 : 600, transition: 'background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)' }}>
                  {label}
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
