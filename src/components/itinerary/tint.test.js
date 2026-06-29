import { describe, it, expect } from 'vitest';
import { tintAt, mixSurface } from './tint.js';

describe('tintAt', () => {
  it('peaks warm at dawn (05:45)', () => {
    const t = tintAt(345);
    expect(t.rgb).toEqual([200, 90, 15]);
    expect(t.strength).toBeCloseTo(0.16, 5);
  });
  it('peaks cool at dusk (21:30)', () => {
    const t = tintAt(1290);
    expect(t.rgb).toEqual([140, 20, 100]);
    expect(t.strength).toBeCloseTo(0.14, 5);
  });
  it('is zero at the window edges and midday', () => {
    expect(tintAt(270).strength).toBe(0); // 04:30 dawn start
    expect(tintAt(450).strength).toBe(0); // 07:30 dawn end
    expect(tintAt(720).strength).toBe(0); // noon
    expect(tintAt(0).strength).toBe(0);   // midnight
  });
  it('ramps partway between start and peak', () => {
    // dawn start 270 → peak 345; halfway-ish 307.5 → ~half of 0.16
    expect(tintAt(307.5).strength).toBeCloseTo(0.08, 2);
  });
});

describe('mixSurface', () => {
  it('returns the base unchanged when strength is 0', () => {
    expect(mixSurface('#10162e', { rgb: [200, 90, 15], strength: 0 }, 1)).toBe('#10162e');
  });
  it('shifts the base toward the tint by strength*mult', () => {
    // black → red at 50% = #800000
    expect(mixSurface('#000000', { rgb: [255, 0, 0], strength: 0.5 }, 1)).toBe('#800000');
  });
  it('clamps strength*mult at 1 (never overshoots the tint colour)', () => {
    expect(mixSurface('#000000', { rgb: [255, 0, 0], strength: 0.8 }, 2)).toBe('#ff0000');
  });
  it('deeper surfaces (higher mult) take more tint', () => {
    const deep = mixSurface('#000000', { rgb: [255, 255, 255], strength: 0.1 }, 2.2);
    const near = mixSurface('#000000', { rgb: [255, 255, 255], strength: 0.1 }, 0.7);
    const v = (h) => parseInt(h.slice(1, 3), 16);
    expect(v(deep)).toBeGreaterThan(v(near));
  });
});
