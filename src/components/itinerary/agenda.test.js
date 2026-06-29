import { describe, it, expect } from 'vitest';
import { agendaAt } from './agenda.js';

describe('agendaAt', () => {
  it('puts an in-progress range event in `now` with remaining minutes', () => {
    const day = { events: [{ time: '09:00 – 17:00', label: 'Festival' }] };
    const { now, soon } = agendaAt(day, 600); // 10:00
    expect(now).toEqual([{ time: '09:00 – 17:00', label: 'Festival', remaining: 420 }]);
    expect(soon).toEqual([]);
  });

  it('infers a point event end as the next event start (capped 60m)', () => {
    const day = { events: [{ time: '09:00', label: 'A' }, { time: '11:00', label: 'B' }] };
    const { now, soon } = agendaAt(day, 570); // 09:30
    // A: start 540, end = min(next 660, 540+60=600) = 600 → 570<600 → now, 30 left
    expect(now).toEqual([{ time: '09:00', label: 'A', remaining: 30 }]);
    // B: start 660 > 570, within 120 → soon, in 90
    expect(soon).toEqual([{ time: '11:00', label: 'B', inMin: 90 }]);
  });

  it('caps Coming Up at 4 items', () => {
    const day = { events: ['08:10','08:20','08:30','08:40','08:50'].map((t,i)=>({time:t,label:`E${i}`})) };
    const { soon } = agendaAt(day, 480); // 08:00
    expect(soon).toHaveLength(4);
  });

  it('surfaces a flight leg as `now` during the flight', () => {
    const day = { travel: { legs: [{ label: 'AC 304', from: 'YVR', to: 'YUL', time: '09:05 → 16:59' }] } };
    const { now } = agendaAt(day, 720); // 12:00
    expect(now).toHaveLength(1);
    expect(now[0].label).toContain('AC 304');
    expect(now[0].remaining).toBe(1019 - 720); // 16:59 = 1019
  });

  it('empty when nothing is active or upcoming soon; nextAt = next start', () => {
    const day = { events: [{ time: '09:00', label: 'A' }, { time: '20:00', label: 'B' }] };
    const { now, soon, nextAt } = agendaAt(day, 600); // 10:00 — A ended (cap 60), B is >120 away
    expect(now).toEqual([]);
    expect(soon).toEqual([]);
    expect(nextAt).toBe('20:00');
  });

  it('returns all-empty for a day with no events or travel', () => {
    expect(agendaAt({ city: 'Gap' }, 600)).toEqual({ now: [], soon: [], nextAt: null });
  });
});
