import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { dateKey, dayNumberFor, puzzleFor } from '../src/daily.js';
import { badgeStats, earnedBadges, nextBadge, easterKey, isConferenceWeekend, BADGES } from '../src/badges.js';
import { guessed, guessedDays } from './helpers.js';

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const dayOf = (key) => dayNumberFor(new Date(`${key}T12:00`));

/** Badges earned with these saved days, played on their own day unless finishedOn says otherwise. */
function earned(today, days, finishedOn = {}, shares = 0) {
  return earnedBadges(badgeStats(today, days, finishedOn, shares));
}

describe('badge list', () => {
  it('has unique ids, and art for every badge (and a badge for every piece of art)', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    const art = readdirSync('public/badges').map((f) => f.replace(/\.svg$/, ''));
    expect([...ids].sort()).toEqual([...art].sort());
  });
});

describe('earning badges', () => {
  it('gives First Step and Pioneer for a first game in October 2026, even a cold one', () => {
    expect(earned(1, guessed(1, 'cold'))).toEqual(['first-step', 'pioneer']);
  });

  it('rewards good guesses', () => {
    const chapter = earned(1, guessed(1, 'chapter'));
    expect(chapter).toEqual(expect.arrayContaining(['right-book', 'right-chapter', 'so-close', 'four-for-four', 'perfect-game']));
    expect(chapter).not.toContain('first-exact');

    const exact = earned(1, guessed(1, 'exact'));
    expect(exact).toEqual(expect.arrayContaining(['first-exact', 'mountain-climber', 'title-keystone', 'title-searcher']));
    expect(exact).not.toContain('exact-5');
    expect(earned(2, guessedDays([1, 2], 'exact'))).toContain('exact-5');
  });

  it('gives hinted levels book credit only, not exact or chapter badges', () => {
    const days = guessed(1, 'exact');
    days[dateKey(1)] = days[dateKey(1)].map((r) => ({ ...r, hint: true }));
    const badges = earned(1, days);
    expect(badges).toEqual(expect.arrayContaining(['right-book', 'four-for-four']));
    expect(badges).not.toContain('first-exact');
    expect(badges).not.toContain('right-chapter');
    expect(badges).not.toContain('perfect-game');
    expect(badges).not.toContain('mountain-climber');
  });

  it('counts games played and streaks', () => {
    const five = earned(5, guessedDays(range(1, 5), 'cold'));
    expect(five).toEqual(expect.arrayContaining(['played-5', 'streak-3']));
    expect(five).not.toContain('streak-7');
    expect(earned(7, guessedDays(range(1, 7), 'cold'))).toContain('streak-7');
  });

  it('rewards catching up and coming back', () => {
    const days = guessedDays([1, 2], 'cold');
    expect(earned(2, days)).not.toContain('searcher-of-records');
    expect(earned(2, days, { [dateKey(1)]: dateKey(2) })).toContain('searcher-of-records');

    expect(earned(4, guessedDays([1, 3], 'cold'))).not.toContain('welcome-back'); // missed 1 day
    expect(earned(4, guessedDays([1, 4], 'cold'))).toContain('welcome-back'); // missed 2 days
  });

  it('rewards a full Sunday-to-Saturday week and 4 Sundays', () => {
    const sunday = dayOf('2026-10-11');
    expect(earned(sunday + 6, guessedDays(range(sunday, sunday + 6), 'cold'))).toContain('full-week');
    expect(earned(sunday + 7, guessedDays(range(sunday + 1, sunday + 7), 'cold'))).not.toContain('full-week');

    const sundays = [0, 7, 14, 21].map((n) => sunday + n);
    expect(earned(sundays[3], guessedDays(sundays, 'cold'))).toContain('sabbath-keeper');
    expect(earned(sundays[3], guessedDays(sundays.slice(1), 'cold'))).not.toContain('sabbath-keeper');
  });

  it('rewards special days', () => {
    const christmas = dayOf('2026-12-25');
    expect(earned(christmas, guessed(christmas, 'cold'))).toContain('christmas');
    expect(earned(christmas, guessed(christmas, 'cold'))).not.toContain('pioneer');
    const easter = dayOf(easterKey(2027));
    expect(earned(easter, guessed(easter, 'cold'))).toContain('easter');
  });

  it('counts shares', () => {
    const days = guessed(1, 'cold');
    expect(earned(1, days, {}, 0)).not.toContain('missionary-1');
    expect(earned(1, days, {}, 5)).toEqual(expect.arrayContaining(['missionary-1', 'missionary-5']));
  });

  it('gives Personal Best for beating your best 7 days, after your first week', () => {
    expect(earned(8, guessedDays(range(1, 8), 'cold'))).not.toContain('personal-best');
    expect(earned(9, { ...guessedDays(range(1, 8), 'cold'), ...guessed(9, 'exact') })).toContain('personal-best');
  });

  it('collects book stamps, Small Plates, and Every Book', () => {
    let days = {};
    let n = 0;
    while (!earned(n, days).includes('all-books')) {
      n++;
      days = { ...days, ...guessed(n, 'chapter') };
      expect(n).toBeLessThan(400); // every book must show up in the schedule
    }
    const all = earned(n, days);
    expect(all.filter((id) => id.startsWith('book-'))).toHaveLength(15);
    expect(all).toEqual(expect.arrayContaining(['small-plates', 'tiny-books']));
  });

  it('rewards famous chapters', () => {
    const n = range(1, 400).find((d) => puzzleFor(d).some((p) => p.ref.startsWith('Alma 32:')));
    expect(earned(n, guessed(n, 'chapter'))).toContain('famous-alma-32');
    expect(earned(n, guessed(n, 'cold'))).not.toContain('famous-alma-32');
  });
});

describe('dates', () => {
  it('finds Easter', () => {
    expect(easterKey(2026)).toBe('2026-04-05');
    expect(easterKey(2027)).toBe('2027-03-28');
  });

  it('finds General Conference weekends', () => {
    expect(isConferenceWeekend('2026-10-03')).toBe(true);
    expect(isConferenceWeekend('2026-10-04')).toBe(true);
    expect(isConferenceWeekend('2026-10-10')).toBe(false);
    expect(isConferenceWeekend('2027-04-03')).toBe(true);
    expect(isConferenceWeekend('2027-03-27')).toBe(false);
  });
});

describe('nextBadge', () => {
  it('suggests the closest badge earned just by playing, never a guessing badge', () => {
    const next = nextBadge(badgeStats(1, guessed(1, 'cold'), {}));
    expect(next.badge.id).toBe('streak-3');
    expect(next.left).toBe(2);
    expect(next.unit).toBe('days in a row');
  });

  it('moves on to the next tier', () => {
    const next = nextBadge(badgeStats(5, guessedDays(range(1, 5), 'cold'), {}));
    expect(next.badge.id).toBe('streak-7');
    expect(next.left).toBe(2);
  });
});
