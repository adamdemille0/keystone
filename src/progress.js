// Streaks, recent points, and personal records, all worked out from the saved days.

import { dateKey, puzzleFor } from './daily.js';
import { isComplete, totalOf } from './storage.js';
import { rankOfResult } from './scoring.js';

function finishedResults(days, n) {
  const results = days[dateKey(n)];
  return Array.isArray(results) && isComplete(results) ? results : null;
}

/** Finished on its own day? Games finished before finish dates were recorded count as on time. */
function onTime(days, finishedOn, n) {
  return Boolean(finishedResults(days, n)) && (finishedOn[dateKey(n)] ?? dateKey(n)) === dateKey(n);
}

/**
 * Consecutive days on which that day's game was finished on the day itself
 * (catching up through Past games doesn't count). The streak stays alive until
 * today is over: if today isn't finished yet, it counts back from yesterday.
 */
export function streak(today, days, finishedOn) {
  let n = onTime(days, finishedOn, today) ? today : today - 1;
  let count = 0;
  while (n >= 1 && onTime(days, finishedOn, n)) {
    count++;
    n--;
  }
  return count;
}

/** The longest streak ever, up to today. */
export function longestStreak(today, days, finishedOn) {
  let best = 0;
  let run = 0;
  for (let n = 1; n <= today; n++) {
    run = onTime(days, finishedOn, n) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Total points from the games of the last 7 days (today and the 6 before it), whenever they were played. */
export function recentPoints(today, days, span = 7) {
  let sum = 0;
  for (let n = Math.max(1, today - span + 1); n <= today; n++) {
    const results = finishedResults(days, n);
    if (results) sum += totalOf(results);
  }
  return sum;
}

/**
 * Every finished game: [{ day, results, ranks, answers }]. ranks[i] is 'exact' | 'chapter' | 'book' | 'close' | 'cold',
 * and answers[i] is the level's answer as { book, chapter, verse }.
 */
export function finishedGames(today, days) {
  const games = [];
  for (let n = 1; n <= today; n++) {
    const results = finishedResults(days, n);
    if (!results) continue;
    const puzzle = puzzleFor(n);
    const ranks = results.map((r, i) => rankOfResult(r, puzzle[i].ref).id);
    games.push({ day: n, results, ranks, answers: puzzle.map((p) => p.answer) });
  }
  return games;
}

/**
 * Personal records. Each is a number where higher is better, so a new record is simply a bigger value.
 * levelBest[i] is the best score on level i + 1.
 */
export function records(today, days, finishedOn) {
  const games = finishedGames(today, days);
  let bestWeek = 0;
  for (let n = 1; n <= today; n++) bestWeek = Math.max(bestWeek, recentPoints(n, days));
  return {
    bestGame: games.reduce((best, g) => Math.max(best, totalOf(g.results)), 0),
    bestWeek,
    longestStreak: longestStreak(today, days, finishedOn),
    exactVerses: games.reduce((sum, g) => sum + g.ranks.filter((r) => r === 'exact').length, 0),
    levelBest: [0, 1, 2, 3].map((i) => games.reduce((best, g) => Math.max(best, g.results[i].points), 0)),
  };
}

export const RECORD_LABELS = {
  bestGame: 'Best game',
  bestWeek: 'Best 7 days',
  longestStreak: 'Longest streak',
  exactVerses: 'Exact verses found',
};

/** Records beaten by going from `before` to `after`: ['bestGame', 'level4', ...]. Nothing counts on someone's first game. */
export function newRecords(before, after, gamesBefore) {
  if (gamesBefore === 0) return [];
  const beaten = Object.keys(RECORD_LABELS).filter((key) => after[key] > before[key]);
  after.levelBest.forEach((points, i) => {
    if (points > before.levelBest[i]) beaten.push(`level${i + 1}`);
  });
  return beaten;
}
