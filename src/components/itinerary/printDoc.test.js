import { describe, it, expect } from 'vitest';
import { dayActivities } from './printDoc.js';

describe('dayActivities', () => {
  it('returns events sorted by start time', () => {
    const day = { events: [
      { time: '15:00', label: 'Check-in · Lindner' },
      { time: '09:00', label: 'Train shuttle' },
    ] };
    expect(dayActivities(day)).toEqual([
      { time: '09:00', label: 'Train shuttle' },
      { time: '15:00', label: 'Check-in · Lindner' },
    ]);
  });

  it('surfaces flight/car travel legs as activities', () => {
    const day = { travel: { legs: [
      { label: 'AC 304', from: 'Vancouver YVR', to: 'Montréal YUL', time: '09:05 → 16:59' },
      { label: 'AC 832', from: 'Montréal YUL', to: 'Brussels BRU', time: '18:25 → 07:10+1' },
    ] } };
    const out = dayActivities(day);
    expect(out).toHaveLength(2);
    expect(out[0].time).toBe('09:05 → 16:59');
    expect(out[0].label).toContain('AC 304');
    expect(out[0].label).toContain('Vancouver YVR → Montréal YUL');
  });

  it('merges events + travel legs into one time-sorted list', () => {
    const day = {
      events: [{ time: '11:00', label: 'Shuttle to festival' }],
      travel: { legs: [{ label: 'AC 304', from: 'YVR', to: 'YUL', time: '09:05 → 16:59' }] },
    };
    const out = dayActivities(day);
    expect(out.map(a => a.label)).toEqual([
      expect.stringContaining('AC 304'),
      'Shuttle to festival',
    ]);
  });

  it('handles a "HH:MM – HH:MM" range by its start', () => {
    const day = { events: [
      { time: '18:00 – 23:59', label: 'Invited' },
      { time: '11:00', label: 'Shuttle' },
    ] };
    expect(dayActivities(day).map(a => a.label)).toEqual(['Shuttle', 'Invited']);
  });

  it('returns [] when a day has neither events nor travel', () => {
    expect(dayActivities({ city: 'Gap day' })).toEqual([]);
  });
});
