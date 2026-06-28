import { dayActivities } from './printDoc.js';

// Printable itinerary document. Hidden on screen (.print-doc { display:none })
// and revealed only by the print stylesheet (see index.css @media print), so the
// PDF contains just this — none of the app chrome. Plain black-on-white, built
// for paper. Format: trip title · people · then per date — location, hotel,
// activities (incl. travel legs) with times.

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };
const sans = { fontFamily: '-apple-system, system-ui, Arial, sans-serif' };
const C_INK = '#111';
const C_MUTED = '#555';
const C_RULE = '#ccc';

export default function ItineraryPrintDoc({ title, crewName, people = [], days = [] }) {
  return (
    <div className="print-doc" style={{ background: '#fff', color: C_INK, padding: '0', maxWidth: 720, margin: '0 auto' }}>
      {/* Masthead */}
      <header style={{ borderBottom: `2px solid ${C_INK}`, paddingBottom: 14, marginBottom: 22 }}>
        <h1 style={{ ...serif, fontSize: 30, fontWeight: 700, margin: '0 0 4px' }}>{title || 'Itinerary'}</h1>
        {crewName && <div style={{ ...sans, fontSize: 14, color: C_MUTED, marginBottom: 8 }}>{crewName}</div>}
        {people.length > 0 && (
          <div style={{ ...sans, fontSize: 13 }}><strong>People:</strong> {people.join(' · ')}</div>
        )}
      </header>

      {days.map((d, i) => {
        const activities = dayActivities(d);
        const hasLodging = d.lodging && !d.lodging.isGap && d.lodging.name;
        return (
          <section key={`${d.month}-${d.dateNum}-${i}`} style={{ marginBottom: 18, breakInside: 'avoid' }}>
            {d.phase && (
              <div style={{ ...sans, fontSize: 10, letterSpacing: '0.18em', color: C_MUTED, textTransform: 'uppercase', margin: '8px 0 6px' }}>{d.phase}</div>
            )}
            {/* Date heading */}
            <h2 style={{ ...serif, fontSize: 17, fontWeight: 700, margin: '0 0 6px', borderBottom: `1px solid ${C_RULE}`, paddingBottom: 4 }}>
              {[d.dayOfWeek, `${d.month} ${d.dateNum}`].filter(Boolean).join(' · ')}
            </h2>

            <div style={{ ...sans, fontSize: 13, lineHeight: 1.55 }}>
              {/* Location */}
              {d.city && (
                <div style={{ marginBottom: 2 }}>
                  <strong>Location:</strong> {d.city}{d.status ? ` — ${d.status}` : ''}
                </div>
              )}
              {/* Hotel */}
              {hasLodging && (
                <div style={{ marginBottom: 2 }}>
                  <strong>Hotel:</strong> {d.lodging.name}
                  {d.lodging.address ? `, ${d.lodging.address}` : ''}
                </div>
              )}
              {/* Activities */}
              {activities.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <strong>Activities:</strong>
                  <ul style={{ margin: '3px 0 0', paddingLeft: 18 }}>
                    {activities.map((a, j) => (
                      <li key={j} style={{ marginBottom: 1 }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: C_MUTED }}>{a.time || 'TBA'}</span>
                        {' — '}{a.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        );
      })}

      <footer style={{ ...sans, fontSize: 10, color: C_MUTED, borderTop: `1px solid ${C_RULE}`, paddingTop: 8, marginTop: 16 }}>
        Generated from the Tomorrowland · Iten 2026 planner.
      </footer>
    </div>
  );
}
