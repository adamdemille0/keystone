// Scoring on a circle of verses: Moroni 10:34 sits right next to 1 Nephi 1:1.

import { TOTAL_VERSES, parseReference } from './reference.js';

// Curve steepness. Higher = harsher on far-off guesses.
// At K = 2, a 100-point level gives: exact 100, an eighth of the circle off 56,
// a quarter off 25, the opposite side 0.
export const K = 2;

export const LEVEL_MAX_POINTS = [100, 200, 300, 400];

// Extra points for guessing the exact verse, on top of the level's points.
// Totals are still shown out of 1,000, so a great day can go over.
export const EXACT_BONUS = 75;

// A hint shows the chapter and verse, leaving just the book to guess. The level is then worth a quarter
// of its points, and there's no exact bonus, since the hint gave away the chapter and verse.
export const HINT_FACTOR = 0.25;

/** Points for a guess: the exact bonus without a hint, or a quarter of the points with one. */
export function levelPoints(guessIndex, answerIndex, maxPoints, hint = false) {
  const factor = hint ? HINT_FACTOR : 1;
  const bonus = guessIndex === answerIndex && !hint ? EXACT_BONUS : 0;
  return { points: Math.round(scoreGuess(guessIndex, answerIndex, maxPoints) * factor) + bonus, bonus, max: maxPoints * factor };
}

// A guess in the wrong book but at most this many verses away counts as "Close".
export const CLOSE_VERSES = 250;

/**
 * How good a guess was, from best to worst: exact, chapter, book, close, cold.
 * guessRef and answerRef are "Alma 32:21" strings.
 */
export function rankOf(guessRef, answerRef, distance) {
  const guess = parseReference(guessRef);
  const answer = parseReference(answerRef);
  if (distance === 0) return RANKS.exact;
  if (guess.book === answer.book && guess.chapter === answer.chapter) return RANKS.chapter;
  if (guess.book === answer.book) return RANKS.book;
  if (distance <= CLOSE_VERSES) return RANKS.close;
  return RANKS.cold;
}

/**
 * Rank for a saved result. With a hint, the chapter and verse were given, so the right book
 * counts as "Right book" rather than exact (and doesn't earn exact-verse or chapter badges).
 */
export function rankOfResult(result, answerRef) {
  if (result.hint && result.distance === 0) return RANKS.hinted;
  return rankOf(result.guessRef, answerRef, result.distance);
}

export const RANKS = {
  hinted: { id: 'book', label: 'Right book', emoji: '💡' },
  exact: { id: 'exact', label: 'Exact!', emoji: '🎯' },
  chapter: { id: 'chapter', label: 'Same chapter', emoji: '🟩' },
  book: { id: 'book', label: 'Same book', emoji: '🟨' },
  close: { id: 'close', label: 'Close', emoji: '🟧' },
  cold: { id: 'cold', label: 'Cold', emoji: '⬜' },
};

// A title for every final score (out of 1,000), so even a low score has something to share.
export const TITLES = [
  [1000, 'Keystone'],
  [800, 'Record Keeper'],
  [600, 'Scholar'],
  [400, 'Student'],
  [200, 'Searcher'],
  [0, 'Seeker'],
];

export function titleFor(total) {
  return TITLES.find(([min]) => total >= min)[1];
}

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
