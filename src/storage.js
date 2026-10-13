// Each day's progress, kept in localStorage under its date ("2026-10-08").
// Storage can be unavailable (private browsing, blocked site data), so every access is guarded.

// TESTING: while true, results are kept in memory only, so refreshing the page
// lets you replay any day. Set to false before launch to save results for real.
export const TEST_MODE = false;

const KEY = 'keystone-days';
const FINISHED_KEY = 'keystone-finished-on'; // { "2026-10-08": "2026-10-08" }: game date -> date it was finished
const BADGES_KEY = 'keystone-badges-shown'; // { "first-exact": true }: badges whose reveal has been shown
const SHARES_KEY = 'keystone-shares'; // { count: 3 }: results shared, for the Missionary badges
const HINTS_KEY = 'keystone-hints'; // { "2026-10-08": [1] }: levels (0-based) where the hint was shown
const LEVELS = 4;
const memory = { [KEY]: {}, [FINISHED_KEY]: {}, [BADGES_KEY]: {}, [SHARES_KEY]: {}, [HINTS_KEY]: {} }; // used instead of localStorage in TEST_MODE

function loadMap(key) {
  if (TEST_MODE) return memory[key];
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function saveMap(key, map) {
  if (TEST_MODE) return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Not saved; the game still works.
  }
}

function loadAll() {
  return loadMap(KEY);
}

/** Results so far for a day: [{ guessRef, distance, points, max }], one per level played. */
export function loadDay(dateKey) {
  const results = loadAll()[dateKey];
  return Array.isArray(results) ? results : [];
}

/**
 * Saves a day's results after each level, so leaving mid-game can't be used to retry a level.
 * When the game is finished, also records the date it was played on (todayKey), for streaks.
 */
export function saveDay(dateKey, results, todayKey) {
  const all = loadAll();
  all[dateKey] = results;
  saveMap(KEY, all);

  const finishedOn = loadMap(FINISHED_KEY);
  if (isComplete(results) && !finishedOn[dateKey]) {
    finishedOn[dateKey] = todayKey;
    saveMap(FINISHED_KEY, finishedOn);
  }
}

/** Badge ids whose reveal animation has already been shown. */
export function loadBadgesShown() {
  return loadMap(BADGES_KEY);
}

export function markBadgesShown(ids) {
  const shown = loadMap(BADGES_KEY);
  for (const id of ids) shown[id] = true;
  saveMap(BADGES_KEY, shown);
}

/**
 * Whether the hint was shown for a level. Saved as soon as it's shown, so leaving and
 * coming back can't be used to get full points after seeing it.
 */
export function hintShown(dateKey, level) {
  const levels = loadMap(HINTS_KEY)[dateKey];
  return Array.isArray(levels) && levels.includes(level);
}

export function saveHintShown(dateKey, level) {
  const hints = loadMap(HINTS_KEY);
  hints[dateKey] = [...new Set([...(hints[dateKey] ?? []), level])];
  saveMap(HINTS_KEY, hints);
}

/** How many times a result has been shared or copied. */
export function loadShares() {
  return Number(loadMap(SHARES_KEY).count) || 0;
}

export function addShare() {
  saveMap(SHARES_KEY, { count: loadShares() + 1 });
}

/** Every saved day, plus the date each finished game was played on. */
export function loadProgress() {
  return { days: loadAll(), finishedOn: loadMap(FINISHED_KEY) };
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
