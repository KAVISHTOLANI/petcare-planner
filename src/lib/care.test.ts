import { describe, expect, it } from 'vitest';
import { addInterval, addWeight, ageLabel, agenda, dueState, intervalLabel, nextDue, validatePet, validateTask, validateWeight, weightTrend, type CareTask, type LogEntry } from './care';

const today = '2026-11-23';
const task = (p: Partial<CareTask>): CareTask => ({ id: 't', petId: 'p', title: 'Flea treatment', category: 'Medication', every: 1, unit: 'month', timesPerDay: 1, start: '2026-11-01', instructions: '', ...p });
const log = (taskId: string, date: string): LogEntry => ({ id: `${taskId}${date}`, taskId, petId: 'p', date, note: '' });

describe('intervals', () => {
  it('adds days, weeks and clamped months', () => {
    expect(addInterval('2026-01-31', 1, 'month')).toBe('2026-02-28');
    expect(addInterval(today, 2, 'week')).toBe('2026-12-07');
    expect(addInterval(today, 10, 'day')).toBe('2026-12-03');
  });
  it('labels intervals', () => {
    expect(intervalLabel({ every: 1, unit: 'day', timesPerDay: 2 })).toBe('2× a day');
    expect(intervalLabel({ every: 1, unit: 'week', timesPerDay: 1 })).toBe('Weekly');
    expect(intervalLabel({ every: 3, unit: 'month', timesPerDay: 1 })).toBe('Every 3 months');
  });
});

describe('due dates', () => {
  it('uses the start date until first done, then one interval after the last time', () => {
    const t = task({});
    expect(nextDue(t, [], today)).toBe('2026-11-01');
    expect(nextDue(t, [log('t', '2026-10-28'), log('t', '2026-11-10')], today)).toBe('2026-12-10');
  });
  it('keeps multi-daily tasks due today until done enough times', () => {
    const feed = task({ id: 'f', unit: 'day', every: 1, timesPerDay: 2 });
    expect(nextDue(feed, [log('f', today)], today)).toBe(today);
    expect(nextDue(feed, [log('f', today), { ...log('f', today), id: 'x' }], today)).toBe('2026-11-24');
    expect(nextDue(task({ id: 'f', unit: 'day', every: 1, start: '2026-12-01' }), [], today)).toBe('2026-12-01');
  });
  it('classifies due states', () => {
    expect(dueState('2026-11-20', today)).toBe('overdue');
    expect(dueState(today, today)).toBe('today');
    expect(dueState('2026-11-26', today)).toBe('soon');
    expect(dueState('2026-11-27', today)).toBe('later');
  });
  it('builds a sorted agenda with remaining counts', () => {
    const feed = task({ id: 'f', title: 'Feed', unit: 'day', every: 1, timesPerDay: 3 });
    const a = agenda([task({}), feed], [log('f', today)], today);
    expect(a.map((x) => x.task.id)).toEqual(['t', 'f']);
    expect(a[1]).toMatchObject({ state: 'today', remaining: 2 });
  });
});

describe('profile helpers', () => {
  it('describes age', () => {
    expect(ageLabel('2023-08-23', today)).toBe('3 years 3 months');
    expect(ageLabel('2025-11-24', today)).toBe('11 months');
    expect(ageLabel('2026-11-10', today)).toBe('13 days');
    expect(ageLabel('', today)).toBe('Age unknown');
  });
  it('tracks weight change and replaces same-day readings', () => {
    const w = addWeight(addWeight([{ date: '2026-01-01', kg: 10 }], '2026-06-01', 11), '2026-06-01', 11.5);
    expect(w).toHaveLength(2);
    expect(weightTrend(w)).toMatchObject({ change: 1.5, pct: 15 });
    expect(weightTrend([]).latest).toBeNull();
  });
  it('validates pets, tasks and weights', () => {
    expect(validatePet({ name: '', birthDate: '2030-01-01' }, today)).toEqual({ name: expect.any(String), birthDate: expect.any(String) });
    expect(validateTask({ title: 'Walk', every: '1', timesPerDay: '0', unit: 'day', start: today }).timesPerDay).toBeDefined();
    expect(validateTask({ title: 'Walk', every: '1', timesPerDay: '0', unit: 'week', start: today })).toEqual({});
    expect(validateWeight('abc', today, today)).toMatch(/kilograms/);
    expect(validateWeight('4.2', '2026-12-01', today)).toMatch(/earlier/);
    expect(validateWeight('4.2', today, today)).toBeNull();
  });
});
