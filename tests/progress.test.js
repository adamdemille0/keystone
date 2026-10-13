import { describe, it, expect } from 'vitest';
import { dateKey } from '../src/daily.js';
import { guessed } from './helpers.js';
import { streak, recentPoints, longestStreak, records, newRecords } from '../src/progress.js';

const game = (points) => [points, 0, 0, 0].map((p) => ({ points: p }));

/** Saved days for the given day numbers, each finished on its own day. */
function played(dayNumbers, points = 100) {
  const days = {};
  const finishedOn = {};
  for (const n of dayNumbers) {
    days[dateKey(n)] = game(points);
    finishedOn[dateKey(n)] = dateKey(n);
  }
  return { days, finishedOn };
}

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    const { days, finishedOn } = played([3, 4, 5]);
    expect(streak(5, days, finishedOn)).toBe(3);
  });

  it('stays alive until today is over', () => {
    const { days, finishedOn } = played([3, 4]);
    expect(streak(5, days, finishedOn)).toBe(2);
    expect(streak(6, days, finishedOn)).toBe(0);
  });

  it('breaks on a missed day', () => {
    const { days, finishedOn } = played([1, 2, 4, 5]);
    expect(streak(5, days, finishedOn)).toBe(2);
  });

  it("doesn't count unfinished games", () => {
    const { days, finishedOn } = played([4]);
    days[dateKey(5)] = game(100).slice(0, 2);
    expect(streak(5, days, finishedOn)).toBe(1);
  });

  it("doesn't count catching up on a past game", () => {
    const { days, finishedOn } = played([3, 5]);
    days[dateKey(4)] = game(100);
    finishedOn[dateKey(4)] = dateKey(5);
    expect(streak(5, days, finishedOn)).toBe(1);
  });

  it('counts games saved before finish dates were recorded', () => {
    const { days } = played([1, 2]);
    expect(streak(2, days, {})).toBe(2);
  });
});

describe('longestStreak', () => {
  it('finds the longest run, even if it has ended', () => {
    const { days, finishedOn } = played([1, 2, 3, 5, 6]);
    expect(longestStreak(9, days, finishedOn)).toBe(3);
  });
});

describe('records', () => {
  it('tracks bests and exact verses', () => {
    const days = { ...guessed(1, 'cold'), ...guessed(2, 'exact') };
    const rec = records(2, days, {});
    expect(rec.bestGame).toBe(1300);
    expect(rec.bestWeek).toBe(1304);
    expect(rec.longestStreak).toBe(2);
    expect(rec.exactVerses).toBe(4);
    expect(rec.levelBest).toEqual([175, 275, 375, 475]);
  });

  it('lists records beaten, but not on the first game', () => {
    const before = records(2, guessed(1, 'cold'), {});
    const after = records(2, { ...guessed(1, 'cold'), ...guessed(2, 'exact') }, {});
    expect(newRecords(before, after, 1)).toEqual([
      'bestGame',
      'bestWeek',
      'longestStreak',
      'exactVerses',
      'level1',
      'level2',
      'level3',
      'level4',
    ]);
    expect(newRecords(records(1, {}, {}), before, 0)).toEqual([]);
  });
});

describe('recentPoints', () => {
  it('adds up finished games from today and the 6 days before', () => {
    const { days } = played([1, 2, 3, 4, 5, 6, 7, 8, 9], 100);
    expect(recentPoints(9, days)).toBe(700);
  });

  it('counts past games caught up on later, and skips unfinished ones', () => {
    const { days } = played([8, 9], 100);
    days[dateKey(7)] = game(50).slice(0, 3);
    expect(recentPoints(9, days)).toBe(200);
  });

  it('handles the first week', () => {
    const { days } = played([1, 2], 100);
    expect(recentPoints(2, days)).toBe(200);
  });
});
