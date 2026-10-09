// Each day's progress, kept in localStorage under its date ("2026-10-08").
// Storage can be unavailable (private browsing, blocked site data), so every access is guarded.

// TESTING: while true, results are kept in memory only, so refreshing the page
// lets you replay any day. Set to false before launch to save results for real.
export const TEST_MODE = false;

const KEY = 'keystone-days';
const LEVELS = 4;
const memory = {}; // used instead of localStorage in TEST_MODE

function loadAll() {
  if (TEST_MODE) return memory;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

/** Results so far for a day: [{ guessRef, distance, points, max }], one per level played. */
export function loadDay(dateKey) {
  const results = loadAll()[dateKey];
  return Array.isArray(results) ? results : [];
}

/** Saves a day's results after each level, so leaving mid-game can't be used to retry a level. */
export function saveDay(dateKey, results) {
  const all = loadAll();
  all[dateKey] = results;
  if (TEST_MODE) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Not saved; the game still works.
  }
}

export function isComplete(results) {
  return results.length >= LEVELS;
}

export function totalOf(results) {
  return results.reduce((sum, r) => sum + r.points, 0);
}

/** Best score and number of completed games, across all days (optionally leaving one day out). */
export function loadStats(excludeKey) {
  const finished = Object.entries(loadAll())
    .filter(([key, r]) => key !== excludeKey && Array.isArray(r) && isComplete(r))
    .map(([, r]) => r);
  return {
    played: finished.length,
    best: finished.reduce((best, r) => Math.max(best, totalOf(r)), 0),
  };
}
