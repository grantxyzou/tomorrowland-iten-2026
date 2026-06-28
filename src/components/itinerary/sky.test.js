import { describe, it, expect } from 'vitest';
import { STOPS, lerpColor, skyGradient, celestial, skyMode } from './sky.js';

describe('lerpColor', () => {
  it('returns the endpoints exactly at t=0 and t=1', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000');
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff');
  });
  it('interpolates the midpoint', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('skyGradient', () => {
  it('equals a keyed stop exactly at that stop minute', () => {
    const noon = STOPS.find((s) => s.min === 720);
    expect(skyGradient(720)).toEqual({ top: noon.top, bottom: noon.bottom });
  });
  it('returns night colors at midnight', () => {
    const night = STOPS[0];
    expect(skyGradient(0)).toEqual({ top: night.top, bottom: night.bottom });
  });
  it('produces a color between the bracketing stops mid-segment', () => {
    // between NOON (720) and LATE DAY (1200) — result differs from both ends
    const g = skyGradient(960);
    expect(g.top).not.toBe(STOPS.find((s) => s.min === 720).top);
    expect(g.top).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('clamps out-of-range minutes', () => {
    expect(skyGradient(-50)).toEqual(skyGradient(0));
    expect(skyGradient(9999)).toEqual(skyGradient(1440));
  });
});

describe('celestial', () => {
  it('shows the sun during the day and the moon at night', () => {
    expect(celestial(720).isSun).toBe(true);   // noon
    expect(celestial(60).isSun).toBe(false);    // 01:00
    expect(celestial(1380).isSun).toBe(false);  // 23:00
  });
  it('moves the body left→right across its active span', () => {
    const morning = celestial(390);  // 06:30
    const evening = celestial(1200); // 20:00
    expect(evening.xPct).toBeGreaterThan(morning.xPct);
    expect(morning.xPct).toBeGreaterThanOrEqual(5);
    expect(evening.xPct).toBeLessThanOrEqual(95);
  });
  it('peaks (highest) near the middle of the arc and is low at the ends', () => {
    const start = celestial(270);  // sunrise edge
    const mid   = celestial(781);  // ~midpoint of sun span (270..1292)
    expect(mid.peak).toBeGreaterThan(start.peak);
    expect(mid.peak).toBeGreaterThan(0.9);
  });
});

describe('skyMode', () => {
  it.each([
    [0, 'NIGHT'],
    [300, 'DAWN'],   // 05:00
    [720, 'DAY'],    // 12:00
    [1292, 'DUSK'],  // 21:32
    [1400, 'NIGHT'], // 23:20
  ])('classifies minute %i as %s', (min, mode) => {
    expect(skyMode(min)).toBe(mode);
  });
});
