import { describe, it, expect } from 'vitest';
import schedule from '../data/schedule.json';
import picks from '../data/level-picks.json';
import { dayNumberFor, dateKey, puzzleFor } from '../src/daily.js';
import { TOTAL_VERSES } from '../src/reference.js';
import { shareText, levelEmoji } from '../src/share.js';

describe('day numbers', () => {
  it('starts at day 1 on October 8, 2026 (local time)', () => {
    expect(schedule.start).toBe('2026-10-08');
    expect(dayNumberFor(new Date(2026, 9, 8, 0, 1))).toBe(1);
    expect(dayNumberFor(new Date(2026, 9, 8, 23, 59))).toBe(1);
    expect(dayNumberFor(new Date(2026, 9, 9, 0, 1))).toBe(2);
    expect(dayNumberFor(new Date(2026, 9, 7, 12))).toBe(0);
  });

  it('is not thrown off by daylight saving time changes', () => {
    expect(dayNumberFor(new Date(2026, 10, 2, 0, 30))).toBe(26); // after US clocks fall back
    expect(dayNumberFor(new Date(2027, 2, 15, 0, 30))).toBe(159); // after US clocks spring forward
  });

  it('converts day numbers back to dates', () => {
    expect(dateKey(1)).toBe('2026-10-08');
    expect(dateKey(26)).toBe('2026-11-02');
    expect(dateKey(366)).toBe('2027-10-08');
  });
});

describe('schedule', () => {
  const levelLists = [picks.level1, picks.level2, picks.level3, picks.level4];

  it('has a valid puzzle with text for every scheduled day', () => {
    schedule.days.forEach((d, i) => {
      expect(d.day).toBe(i + 1);
      expect(d.date).toBe(dateKey(i + 1));
      const puzzle = puzzleFor(d.day);
      expect(puzzle).toHaveLength(4);
      for (const p of puzzle) {
        expect(p.text.length).toBeGreaterThan(0);
        expect(p.answerIndex).toBeGreaterThanOrEqual(0);
        expect(p.answerIndex).toBeLessThan(TOTAL_VERSES);
      }
    });
  });

  it("uses each level's own list", () => {
    for (const d of schedule.days) {
      d.verses.forEach((ref, level) => expect(levelLists[level]).toContain(ref));
    }
  });

  it('uses every verse in a level once before repeating any', () => {
    levelLists.forEach((list, level) => {
      const firstCycle = schedule.days.slice(0, list.length).map((d) => d.verses[level]);
      expect(new Set(firstCycle).size).toBe(list.length);
    });
  });

  it('never repeats a verse on back-to-back days', () => {
    for (let i = 1; i < schedule.days.length; i++) {
      for (let level = 0; level < 4; level++) {
        expect(schedule.days[i].verses[level]).not.toBe(schedule.days[i - 1].verses[level]);
      }
    }
  });

  it('still returns a puzzle after the schedule runs out', () => {
    expect(puzzleFor(schedule.days.length + 5)).toHaveLength(4);
  });
});

describe('share text', () => {
  it('shows the score and one emoji per level, without the verses', () => {
    const results = [
      { points: 100, max: 100 },
      { points: 190, max: 200 },
      { points: 150, max: 300 },
      { points: 0, max: 400 },
    ];
    const text = shareText(12, results, 1000, 'https://example.com');
    expect(text).toBe('Keystone #12 · Student · 440/1,000\n🎯🟩🟨🟥\nhttps://example.com');
  });

  it('picks emoji by share of max points', () => {
    expect(levelEmoji(175, 100)).toBe('🎯'); // exact, with bonus
    expect(levelEmoji(39, 400)).toBe('🟥');
    expect(levelEmoji(40, 400)).toBe('🟧');
  });
});
