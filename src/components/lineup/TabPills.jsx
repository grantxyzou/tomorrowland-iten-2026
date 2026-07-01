import { sans, rPill } from './theme.js';

// Bottom-bar tab switcher — Itinerary / Lineup as pill buttons matching the
// account + day pills. Renders nothing when there's only one tab (non-ldg crews
// see Lineup only). Colours are passed in so it fits either bar (the dark Lineup
// bar or the palette-driven Itinerary bar). Keeps role=tab / aria-controls so it
// still pairs with <main id="tabpanel">.
export default function TabPills({ tabs, activeTab, onSelectTab, activeBg, activeInk, chipBg, chipBorder, chipInk }) {
  if (!tabs || tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label="Sections" style={{ display: 'flex', gap: 9 }}>
      {tabs.map(t => {
        const on = t.id === activeTab;
        return (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={on}
            aria-controls="tabpanel"
            onClick={() => onSelectTab(t.id)}
            style={{
              minHeight: 44, padding: '0 16px', borderRadius: rPill,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              ...sans, fontSize: 14, fontWeight: 700, cursor: 'pointer',
              backgroundColor: on ? activeBg : chipBg,
              border: `1px solid ${on ? activeBg : chipBorder}`,
              color: on ? activeInk : chipInk,
              transition: 'background-color var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out)',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
