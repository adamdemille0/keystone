import { describe, it, expect } from 'vitest';
import { scoreGuess, circularDistance, LEVEL_MAX_POINTS } from '../src/scoring.js';
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

  it('never goes below 0 or above max', () => {
    for (let guess = 0; guess < TOTAL_VERSES; guess += 37) {
      const s = scoreGuess(guess, 500, 400);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(400);
    }
  });
});
