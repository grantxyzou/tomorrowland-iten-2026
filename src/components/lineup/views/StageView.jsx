import { MagnifyingGlass, X, CaretRight } from '@phosphor-icons/react';
import { STAGES } from '../../../data/lineup.js';
import { mono, sans, display, ink, muted, rule, paper, chip, tmrwGold, shRow, STAGE_ORDER } from '../theme.js';
import ArtistRow from '../ArtistRow.jsx';
import { StageSpotify } from '../SpotifyExport.jsx';

// STAGE (browse) view — count + search + expand-all controls, then a collapsible
// section per stage. Your picks highlight inline for the active person.
export default function StageView({
  groups, browseLiveCount, dayCount, forceOpen, search, setSearch,
  searchOpen, setSearchOpen, searchPresent, openStages, setOpenStages,
  toggleStage, myColor, picks, activePerson, rowProps, notify,
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: searchOpen ? 10 : 8, flexWrap: 'wrap' }}>
        <span style={{ ...mono, fontSize: 10, color: muted }}>
          {browseLiveCount}{browseLiveCount !== dayCount ? ` / ${dayCount}` : ''} artists · {groups.length} stage{groups.length === 1 ? '' : 's'}
        </span>
        <button onClick={() => setSearchOpen(o => !o)} aria-expanded={searchOpen} aria-label="Search artists"
          style={{ marginLeft: 'auto', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'none', color: searchOpen ? ink : muted, cursor: 'pointer' }}>
          <MagnifyingGlass size={18} weight="bold" />
        </button>
        {!forceOpen && (
          <button onClick={() => setOpenStages(openStages.size >= groups.length ? new Set() : new Set(STAGE_ORDER))}
            style={{ minHeight: 44, padding: '0 4px', border: 'none', background: 'none', color: myColor, ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', transition: 'color var(--dur-base) var(--ease-out)' }}>
            {openStages.size >= groups.length ? 'Collapse all' : 'Expand all'}
          </button>
        )}
      </div>
      {searchPresent && (
        <div data-open={searchOpen} className="fx-pop" style={{ position: 'relative', marginBottom: 12 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: muted, pointerEvents: 'none', display: 'inline-flex' }}><MagnifyingGlass size={15} weight="bold" /></span>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search artists…"
            type="search" inputMode="search" aria-label="Search artists"
            onKeyDown={e => { if (e.key === 'Escape') { setSearch(''); setSearchOpen(false); } }}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 46px 10px 32px', minHeight: 44, borderRadius: 11, border: 'none', backgroundColor: chip, color: ink, fontSize: 16, ...sans }} />
          <button onClick={() => { setSearch(''); setSearchOpen(false); }} aria-label="Close search"
            style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: muted, cursor: 'pointer', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} weight="bold" /></button>
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: muted }}>
          <MagnifyingGlass size={30} weight="regular" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 14 }}>No artists match "{search}".</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(({ stage, sets: stageSets }, idx) => {
            const color = STAGES[stage]?.color || tmrwGold;
            const open  = forceOpen || openStages.has(stage);
            const pickedSets = stageSets.filter(s => picks[s.id]?.[activePerson]);
            const picked = pickedSets.length;
            const liveCount = stageSets.filter(s => s.status !== 'deleted').length;
            return (
              <section key={stage} className="fx-enter" style={{ animationDelay: `${Math.min(idx, 8) * 40}ms`, borderRadius: 13, overflow: 'hidden', backgroundColor: paper, boxShadow: shRow }}>
                <button onClick={() => !forceOpen && toggleStage(stage)} aria-expanded={open}
                  aria-label={`${stage}, ${liveCount} artists${picked > 0 ? `, ${picked} of your picks` : ''}`}
                  style={{ width: '100%', textAlign: 'left', cursor: forceOpen ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', minHeight: 44, border: 'none', background: 'none' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
                  <span aria-hidden="true" style={{ ...display, fontSize: 23, fontWeight: 700, color: ink, letterSpacing: '0.01em', flex: 1 }}>{stage}</span>
                  {picked > 0 && (
                    <span aria-hidden="true" style={{ ...mono, fontSize: 10, fontWeight: 700, color: tmrwBg, backgroundColor: myColor, borderRadius: 999, padding: '2px 8px' }}>Selected ({picked})</span>
                  )}
                  <span aria-hidden="true" style={{ ...mono, fontSize: 11, color: muted }}>{liveCount}</span>
                  <CaretRight aria-hidden="true" size={14} weight="bold" color={muted} style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast) var(--ease-in-out)' }} />
                </button>
                {open && (
                  <div className="fx-collapse" data-open="true">
                    <div style={{ borderTop: `1px solid ${rule}` }}>
                      {stageSets.map(set => <ArtistRow key={set.id} {...rowProps(set)} showStage={false} />)}
                      {picked > 0 && <StageSpotify stage={stage} pickedSets={pickedSets} onCopied={notify} />}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
