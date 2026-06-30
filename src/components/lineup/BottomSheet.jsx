import { useEffect } from 'react';
import { paper, muted, mono, sheetMaxW } from './theme.js';

// Reusable bottom action sheet (Trip Bar spec): a scrim + a slide-up panel with
// a 30px top radius. Escape or a scrim tap closes it. Sits above the Trip Bar.
export default function BottomSheet({ title, accent, action, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    // Lock background scroll while the sheet is open (mirrors PartyMode); the
    // scrim already blocks taps, this makes the background fully inert.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} aria-hidden="true" className="fx-fade"
        style={{ position: 'fixed', inset: 0, zIndex: 70, backgroundColor: 'rgba(4,7,18,0.6)' }} />
      <div role="dialog" aria-modal="true" aria-label={title} className="fx-sheet"
        style={{
          // Capped at a phone width and centred (margin:auto, so the .fx-sheet
          // translateY slide-up is untouched) — matches the account sheet.
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 71, maxWidth: sheetMaxW, margin: '0 auto',
          backgroundColor: paper,
          borderTopLeftRadius: 30, borderTopRightRadius: 30, boxShadow: '0 -12px 40px rgba(0,0,0,0.55)',
          padding: '14px max(16px, env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        }}>
        <div>
          {/* grab handle */}
          <div aria-hidden="true" style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: '#243056', margin: '0 auto 14px' }} />
          {(title || action) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              {title && <div style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent || muted }}>{title}</div>}
              {action}
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  );
}
