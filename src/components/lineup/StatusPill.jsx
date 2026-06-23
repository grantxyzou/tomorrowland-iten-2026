import { mono, tmrwGold, tmrwBg, bodyMuted, rule } from './theme.js';

// ── Change tag ───────────────────────────────────────────────
// Tiny pill that flags how an entry differs from the previous roster
// after the official sync: NEW (added), EDITED (renamed), REMOVED (dropped).
export default function StatusPill({ status, accent = tmrwGold }) {
  const map = {
    new:     { label: 'NEW',     bg: accent,        fg: tmrwBg,    border: 'none' },
    edited:  { label: 'EDITED',  bg: 'transparent', fg: bodyMuted, border: `1px solid ${rule}` },
    deleted: { label: 'REMOVED', bg: 'transparent', fg: bodyMuted, border: `1px solid ${rule}` },
  };
  const s = map[status];
  if (!s) return null;
  return (
    <span style={{
      ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
      lineHeight: 1, padding: '2.5px 5px', borderRadius: 4, flexShrink: 0,
      backgroundColor: s.bg, color: s.fg, border: s.border,
    }}>{s.label}</span>
  );
}
