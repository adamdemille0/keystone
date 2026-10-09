// Scoring on a circle of verses: Moroni 10:34 sits right next to 1 Nephi 1:1.

import { TOTAL_VERSES } from './reference.js';

// Curve steepness. Higher = harsher on far-off guesses.
// At K = 2, a 100-point level gives: exact 100, an eighth of the circle off 56,
// a quarter off 25, the opposite side 0.
export const K = 2;

export const LEVEL_MAX_POINTS = [100, 200, 300, 400];

/** Shortest distance between two verse indexes, going either way around the circle. */
export function circularDistance(a, b, total = TOTAL_VERSES) {
  const distance = Math.abs(a - b);
  return Math.min(distance, total - distance);
}

/** Points for a guess. An exact guess always earns maxPoints. */
export function scoreGuess(guessIndex, answerIndex, maxPoints, total = TOTAL_VERSES) {
  const fraction = circularDistance(guessIndex, answerIndex, total) / (total / 2);
  return Math.round(maxPoints * (1 - fraction) ** K);
}
