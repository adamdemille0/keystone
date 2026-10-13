// Every badge, and how it's earned. Badge art is public/badges/<id>.svg.
// Badges are worked out from saved history each time, so new badges are awarded for past games too.

import { dateKey } from './daily.js';
import { finishedGames, streak, longestStreak, recentPoints } from './progress.js';
import { totalOf } from './storage.js';
import { TITLES } from './scoring.js';
import { BOOKS } from './reference.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SMALL_PLATES = ['1 Nephi', '2 Nephi', 'Jacob', 'Enos', 'Jarom', 'Omni'];
const TINY_BOOKS = ['Enos', 'Jarom', 'Omni', 'Words of Mormon'];
const PIONEER_UNTIL = '2026-11-07'; // the game's first month (launched 2026-10-08)

const keyToUtc = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const weekday = (key) => new Date(keyToUtc(key)).getUTCDay(); // 0 = Sunday
const addDays = (key, n) => new Date(keyToUtc(key) + n * DAY_MS).toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, '0');

/** Easter Sunday for a year, as "2027-03-28" (anonymous Gregorian algorithm). */
export function easterKey(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** General Conference: the first Sunday of April or October, and the Saturday before it. */
export function isConferenceWeekend(key) {
  const sunday = weekday(key) === 0 ? key : weekday(key) === 6 ? addDays(key, 1) : null;
  if (!sunday) return false;
  const [, month, day] = sunday.split('-').map(Number);
  return (month === 4 || month === 10) && day <= 7;
}

export const bookSlug = (name) => name.toLowerCase().replace(/ /g, '-');

/** Everything the badges need, worked out once from saved history. */
export function badgeStats(today, days, finishedOn, shares = 0) {
  const games = finishedGames(today, days);
  const rightBook = (r) => r !== 'close' && r !== 'cold';
  const rightChapter = (r) => r === 'exact' || r === 'chapter';

  const books = new Set();
  const chapters = new Set(); // "Alma 32", guessed in the right chapter or better
  for (const g of games) {
    g.ranks.forEach((r, i) => {
      if (rightBook(r)) books.add(g.answers[i].book);
      if (rightChapter(r)) chapters.add(`${g.answers[i].book} ${g.answers[i].chapter}`);
    });
  }

  // The dates games were actually played on. Games from before finish dates were recorded count as played on their own day.
  const gameKeys = games.map((g) => dateKey(g.day));
  const playDates = [...new Set(gameKeys.map((key) => finishedOn[key] ?? key))].sort();
  const played = new Set(playDates);

  // Personal best: beat your best 7-day total, after your first full week.
  let personalBest = false;
  if (games.length) {
    let best = 0;
    for (let n = games[0].day; n <= today; n++) {
      const points = recentPoints(n, days);
      if (n >= games[0].day + 7 && points > best && best > 0) personalBest = true;
      best = Math.max(best, points);
    }
  }

  return {
    gamesPlayed: games.length,
    currentStreak: streak(today, days, finishedOn),
    longestStreak: longestStreak(today, days, finishedOn),
    exactVerses: games.reduce((sum, g) => sum + g.ranks.filter((r) => r === 'exact').length, 0),
    bestGame: games.reduce((best, g) => Math.max(best, totalOf(g.results)), 0),
    rightBook: games.some((g) => g.ranks.some(rightBook)),
    rightChapter: games.some((g) => g.ranks.some(rightChapter)),
    soClose: games.some((g) => g.results.some((r) => r.distance === 1)),
    fourForFour: games.some((g) => g.ranks.every(rightBook)),
    perfectGame: games.some((g) => g.ranks.every(rightChapter)),
    level4Exact: games.some((g) => g.ranks[3] === 'exact'),
    personalBest,
    books,
    chapters,
    caughtUp: gameKeys.some((key) => finishedOn[key] && finishedOn[key] !== key),
    welcomeBack: playDates.some((key, i) => i > 0 && (keyToUtc(key) - keyToUtc(playDates[i - 1])) / DAY_MS >= 3),
    fullWeek: playDates.some((key) => weekday(key) === 0 && [1, 2, 3, 4, 5, 6].every((n) => played.has(addDays(key, n)))),
    sundays: playDates.filter((key) => weekday(key) === 0).length,
    christmas: playDates.some((key) => key.endsWith('-12-25')),
    easter: playDates.some((key) => key === easterKey(Number(key.slice(0, 4)))),
    conference: playDates.some(isConferenceWeekend),
    pioneer: playDates.some((key) => key <= PIONEER_UNTIL),
    shares,
  };
}

// ---------- The badges ----------
// Each badge: { id, name, description, group, earned(stats) }, plus for badges you work toward:
// progress(stats) -> [have, need] and unit: [singular, plural]. Badges in a series share `series` and have a `tier`.

const series = (key, values, make) =>
  values.map((value, i) => ({ series: key, tier: i + 1, ...make(value) }));

export const GROUPS = [
  { id: 'showing-up', name: 'Showing up' },
  { id: 'getting-better', name: 'Getting better' },
  { id: 'books', name: 'Book stamps' },
  { id: 'collections', name: 'Collections' },
  { id: 'special', name: 'Special days' },
];

const TITLE_BADGES = TITLES.filter(([min]) => min > 0)
  .reverse()
  .map(([min, title]) => ({ min, title }));

export const BADGES = [
  // Showing up
  {
    id: 'first-step',
    group: 'showing-up',
    name: 'First Step',
    description: 'Finish your first game.',
    earned: (s) => s.gamesPlayed >= 1,
  },
  ...series('played', [5, 10, 25, 50, 100, 365], (n) => ({
    id: `played-${n}`,
    group: 'showing-up',
    name: `${n} Games`,
    description: `Finish ${n} games.`,
    earned: (s) => s.gamesPlayed >= n,
    progress: (s) => [s.gamesPlayed, n],
    unit: ['game', 'games'],
  })),
  ...series('streak', [3, 7, 14, 30, 100, 365], (n) => ({
    id: `streak-${n}`,
    group: 'showing-up',
    name: `Iron Rod: ${n} Days`,
    description: `Finish the daily game ${n} days in a row.`,
    earned: (s) => s.longestStreak >= n,
    progress: (s) => [s.currentStreak, n],
    unit: ['day in a row', 'days in a row'],
  })),
  {
    id: 'full-week',
    group: 'showing-up',
    name: 'Full Week',
    description: 'Play every day from Sunday to Saturday.',
    earned: (s) => s.fullWeek,
  },
  {
    id: 'sabbath-keeper',
    group: 'showing-up',
    name: 'Sabbath Keeper',
    description: 'Play on 4 Sundays.',
    earned: (s) => s.sundays >= 4,
    progress: (s) => [s.sundays, 4],
    unit: ['Sunday', 'Sundays'],
  },
  {
    id: 'welcome-back',
    group: 'showing-up',
    name: 'Welcome Back',
    description: 'Come back after missing a few days.',
    earned: (s) => s.welcomeBack,
  },
  {
    id: 'searcher-of-records',
    group: 'showing-up',
    name: 'Searcher of Records',
    description: 'Catch up on a game from Past games.',
    earned: (s) => s.caughtUp,
  },
  ...series('missionary', [1, 5, 25], (n) => ({
    id: `missionary-${n}`,
    group: 'showing-up',
    name: n === 1 ? 'Missionary' : `Missionary: ${n} Shares`,
    description: n === 1 ? 'Share your result.' : `Share your result ${n} times.`,
    earned: (s) => s.shares >= n,
    progress: (s) => [s.shares, n],
    unit: ['share', 'shares'],
  })),

  // Getting better
  {
    id: 'right-book',
    group: 'getting-better',
    name: 'Right Book',
    description: 'Guess the right book for a verse.',
    earned: (s) => s.rightBook,
  },
  {
    id: 'right-chapter',
    group: 'getting-better',
    name: 'Right Chapter',
    description: 'Guess the right chapter for a verse.',
    earned: (s) => s.rightChapter,
  },
  ...series('exact', [1, 5, 25, 100], (n) => ({
    id: n === 1 ? 'first-exact' : `exact-${n}`,
    group: 'getting-better',
    name: n === 1 ? 'First Exact Verse' : `${n} Exact Verses`,
    description: n === 1 ? 'Guess a verse exactly.' : `Guess ${n} verses exactly.`,
    earned: (s) => s.exactVerses >= n,
    progress: (s) => [s.exactVerses, n],
    unit: ['exact verse', 'exact verses'],
  })),
  {
    id: 'so-close',
    group: 'getting-better',
    name: 'So Close',
    description: 'Guess just 1 verse away.',
    earned: (s) => s.soClose,
  },
  ...series('title', TITLE_BADGES, ({ min, title }) => ({
    id: `title-${title.toLowerCase().replace(/ /g, '-')}`,
    group: 'getting-better',
    name: title,
    description: `Earn the ${title} title: ${min.toLocaleString()}+ points in one game.`,
    earned: (s) => s.bestGame >= min,
  })),
  {
    id: 'four-for-four',
    group: 'getting-better',
    name: 'Four for Four',
    description: 'Guess the right book on all 4 levels in one game.',
    earned: (s) => s.fourForFour,
  },
  {
    id: 'perfect-game',
    group: 'getting-better',
    name: 'Perfect Game',
    description: 'Guess all 4 verses in a game in the right chapter.',
    earned: (s) => s.perfectGame,
  },
  {
    id: 'mountain-climber',
    group: 'getting-better',
    name: 'Mountain Climber',
    description: 'Guess the Level 4 verse exactly.',
    earned: (s) => s.level4Exact,
  },
  {
    id: 'personal-best',
    group: 'getting-better',
    name: 'Personal Best',
    description: 'Beat your best 7-day score, after your first week.',
    earned: (s) => s.personalBest,
  },

  // Book stamps
  ...BOOKS.map(({ name }) => ({
    id: `book-${bookSlug(name)}`,
    group: 'books',
    name,
    description: `Guess the right book for a verse from ${name}.`,
    earned: (s) => s.books.has(name),
  })),

  // Collections
  {
    id: 'all-books',
    group: 'collections',
    name: 'Every Book',
    description: `Collect all ${BOOKS.length} book stamps.`,
    earned: (s) => s.books.size === BOOKS.length,
    progress: (s) => [s.books.size, BOOKS.length],
    unit: ['book stamp', 'book stamps'],
  },
  {
    id: 'small-plates',
    group: 'collections',
    name: 'Small Plates',
    description: 'Collect the stamps for 1 Nephi through Omni.',
    earned: (s) => SMALL_PLATES.every((b) => s.books.has(b)),
    progress: (s) => [SMALL_PLATES.filter((b) => s.books.has(b)).length, SMALL_PLATES.length],
    unit: ['book stamp', 'book stamps'],
  },
  {
    id: 'tiny-books',
    group: 'collections',
    name: 'Tiny Books',
    description: 'Guess the right book for a verse from Enos, Jarom, Omni, or Words of Mormon.',
    earned: (s) => TINY_BOOKS.some((b) => s.books.has(b)),
  },
  ...[
    ['Alma', 32],
    ['Moroni', 10],
    ['3 Nephi', 11],
  ].map(([book, chapter]) => ({
    id: `famous-${bookSlug(book)}-${chapter}`,
    group: 'collections',
    name: `${book} ${chapter}`,
    description: `Guess the right chapter for a verse from ${book} ${chapter}.`,
    earned: (s) => s.chapters.has(`${book} ${chapter}`),
  })),

  // Special days
  {
    id: 'christmas',
    group: 'special',
    name: 'Christmas',
    description: 'Play on Christmas Day.',
    earned: (s) => s.christmas,
  },
  {
    id: 'easter',
    group: 'special',
    name: 'Easter',
    description: 'Play on Easter Sunday.',
    earned: (s) => s.easter,
  },
  {
    id: 'general-conference',
    group: 'special',
    name: 'General Conference',
    description: 'Play on a General Conference weekend.',
    earned: (s) => s.conference,
  },
  {
    id: 'pioneer',
    group: 'special',
    name: 'Pioneer',
    description: "Play in Keystone's first month.",
    earned: (s) => s.pioneer,
  },
];

/** Ids of every badge earned so far. */
export function earnedBadges(stats) {
  return BADGES.filter((b) => b.earned(stats)).map((b) => b.id);
}

/**
 * The unearned badge someone is closest to, for a "Next badge" nudge: { badge, left, unit }, or null.
 * Only badges earned just by playing (games, streaks, Sundays) are suggested, so the nudge is always
 * something a player can do, however well they guess. Missionary badges are left out too.
 */
export function nextBadge(stats) {
  let next = null;
  for (const badge of BADGES) {
    if (badge.group !== 'showing-up' || !badge.progress || badge.series === 'missionary' || badge.earned(stats)) continue;
    const [have, need] = badge.progress(stats);
    const left = need - have;
    if (left > 0 && (!next || left < next.left)) next = { badge, left, unit: badge.unit[left === 1 ? 0 : 1] };
  }
  return next;
}
