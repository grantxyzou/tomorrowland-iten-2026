import { Headphones, Clock } from '@phosphor-icons/react';
import { mono, muted, rule, paper } from '../theme.js';
import ArtistRow from '../ArtistRow.jsx';

// TIME (my plan) view — the active person's picks for the day, in time order.
export default function TimeView({ timeline, dayHasTimes, activePerson, dayLabel, rowProps }) {
  if (timeline.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 16px', color: muted }}>
        <Headphones size={30} weight="regular" style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 14 }}>{activePerson} hasn't picked anyone for {dayLabel} yet.<br />Add some from the Stage tab.</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ ...mono, fontSize: 10, color: muted, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>
        {activePerson}'s plan · {timeline.length} pick{timeline.length === 1 ? '' : 's'}
      </div>
      {!dayHasTimes && (
        <div style={{ ...mono, fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 12, padding: '10px 12px', border: `1px solid ${rule}`, borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
          <Clock size={15} weight="regular" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Set times not announced yet — showing alphabetically. This view becomes a chronological timeline (with overlap highlighting) once times drop.</span>
        </div>
      )}
      <section style={{ borderRadius: 10, border: `1px solid ${rule}`, overflow: 'hidden', backgroundColor: paper }}>
        {timeline.map(set => <ArtistRow key={set.id} {...rowProps(set)} showStage={true} />)}
      </section>
    </div>
  );
}
