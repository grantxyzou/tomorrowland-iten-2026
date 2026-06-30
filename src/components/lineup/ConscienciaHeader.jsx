import { display, mono, goldLit } from './theme.js';
import { TomorrowlandMark } from '../BrandMarks.jsx';

// The Lineup header BODY — the "Consciencia" wordmark over the midnight gradient,
// filling the shared TabHeader banner (the identity strip + tab bar come from
// TabHeader). Body-only: absolute inset:0 so it fills its parent banner.
export default function ConscienciaHeader() {
  return (
    <div aria-hidden="false" style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: 'linear-gradient(180deg, #070b1c 0%, #0c1228 55%, #10162e 100%)',
    }}>
      <div aria-hidden="true" style={{ position: 'absolute', top: 6,  left: '8%',  width: 150, height: 38, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(120,150,230,0.5), rgba(120,150,230,0))', filter: 'blur(12px)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', top: 30, left: '60%', width: 170, height: 42, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(150,120,210,0.45), rgba(150,120,210,0))', filter: 'blur(14px)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(closest-side at 50% 100%, rgba(240,210,120,0.55), rgba(240,210,120,0) 62%)' }} />
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 58% 54% at 50% 45%, rgba(6,9,24,0.45), rgba(6,9,24,0) 72%)' }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <TomorrowlandMark color={goldLit} style={{ width: 30, height: 30, marginBottom: 6, filter: 'drop-shadow(0 1px 6px rgba(6,9,24,0.8))' }} />
        <h2 style={{ ...display, fontSize: 'clamp(34px, 11vw, 42px)', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1, color: goldLit, textShadow: '0 1px 12px rgba(6,9,24,0.85)', fontVariationSettings: '"SOFT" 30, "opsz" 144', margin: 0, whiteSpace: 'nowrap' }}>Consciencia</h2>
        <div style={{ ...mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', color: 'rgba(242,236,220,0.92)', marginTop: 7, textShadow: '0 1px 6px rgba(6,9,24,0.7)' }}>TOMORROWLAND · BELGIUM 2026</div>
      </div>
    </div>
  );
}
