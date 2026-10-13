import { describe, it, expect } from 'vitest';
import {
  scoreGuess,
  circularDistance,
  levelPoints,
  rankOf,
  rankOfResult,
  titleFor,
  LEVEL_MAX_POINTS,
  CLOSE_VERSES,
} from '../src/scoring.js';
import { referenceToIndex, TOTAL_VERSES } from '../src/reference.js';

const HALF = TOTAL_VERSES / 2;

describe('scoreGuess', () => {
  it('gives full points for an exact guess at every level', () => {
    for (const max of LEVEL_MAX_POINTS) {
      for (const index of [0, 1234, TOTAL_VERSES - 1]) {
        expect(scoreGuess(index, index, max)).toBe(max);
      }
    }
  });

  it('treats 1 Nephi 1:1 and Moroni 10:34 as neighbors (wraparound)', () => {
    const first = referenceToIndex({ book: '1 Nephi', chapter: 1, verse: 1 });
    const last = referenceToIndex({ book: 'Moroni', chapter: 10, verse: 34 });
    expect(circularDistance(first, last)).toBe(1);
    for (const max of LEVEL_MAX_POINTS) {
      expect(scoreGuess(first, last, max)).toBeGreaterThanOrEqual(max * 0.99);
    }
  });

  it('gives 0 for a guess on the opposite side of the circle', () => {
    for (const max of LEVEL_MAX_POINTS) {
      expect(scoreGuess(0, HALF, max)).toBe(0);
      expect(scoreGuess(100, 100 + HALF, max)).toBe(0);
    }
  });

  it('matches the documented curve at K = 2', () => {
    expect(scoreGuess(0, HALF / 2, 100)).toBe(25); // quarter circle
    expect(scoreGuess(0, Math.round(HALF / 4), 100)).toBe(56); // eighth circle
  });

  it('is symmetric: swapping guess and answer gives the same score', () => {
    const pairs = [
      [0, TOTAL_VERSES - 1],
      [10, 5000],
      [3000, 3301],
      [6600, 2],
      [1234, 4321],
    ];
    for (const max of LEVEL_MAX_POINTS) {
      for (const [a, b] of pairs) {
        expect(scoreGuess(a, b, max)).toBe(scoreGuess(b, a, max));
      }
    }
  });

  it('ranks guesses from exact to cold', () => {
    expect(rankOf('Alma 32:21', 'Alma 32:21', 0).id).toBe('exact');
    expect(rankOf('Alma 32:1', 'Alma 32:21', 20).id).toBe('chapter');
    expect(rankOf('Alma 1:1', 'Alma 32:21', 900).id).toBe('book');
    expect(rankOf('Helaman 1:1', 'Alma 63:17', 1).id).toBe('close');
    expect(rankOf('Helaman 1:1', 'Alma 63:17', CLOSE_VERSES + 1).id).toBe('cold');
  });

  it('gives a quarter of the points and no exact bonus when a hint was used', () => {
    expect(levelPoints(500, 500, 400)).toEqual({ points: 475, bonus: 75, max: 400 });
    expect(levelPoints(500, 500, 400, true)).toEqual({ points: 100, bonus: 0, max: 100 });
    const far = levelPoints(0, Math.round(HALF / 4), 100, true);
    expect(far).toEqual({ points: 14, bonus: 0, max: 25 }); // a quarter of 56
  });

  it('ranks a right-book guess with a hint as "Right book", not exact', () => {
    expect(rankOfResult({ guessRef: 'Alma 32:21', distance: 0, hint: true }, 'Alma 32:21').label).toBe('Right book');
    expect(rankOfResult({ guessRef: 'Alma 32:21', distance: 0 }, 'Alma 32:21').id).toBe('exact');
  });

  it('gives every score a title', () => {
    expect(titleFor(0)).toBe('Seeker');
    expect(titleFor(399)).toBe('Searcher');
    expect(titleFor(400)).toBe('Student');
    expect(titleFor(1150)).toBe('Keystone');
  });

  it('never goes below 0 or above max', () => {
    for (let guess = 0; guess < TOTAL_VERSES; guess += 37) {
      const s = scoreGuess(guess, 500, 400);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(400);
    }
  });
});
