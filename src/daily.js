// Daily games: day #1 is schedule.start, and a new game begins at local midnight.

import schedule from '../data/schedule.json';
import verseText from '../data/verses.json';
import { parseReference, referenceToIndex } from './reference.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const [startY, startM, startD] = schedule.start.split('-').map(Number);
const START_UTC = Date.UTC(startY, startM - 1, startD);

/** Day number for a local calendar date (1 = launch day). Uses calendar dates, so DST doesn't matter. */
export function dayNumberFor(date = new Date()) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc - START_UTC) / DAY_MS) + 1;
}

/** Today's day number. Below 1 means the game hasn't launched yet in this time zone. */
export function todayNumber() {
  return dayNumberFor(new Date());
}

/** "2026-10-08" for a day number; used as the storage key. */
export function dateKey(dayNumber) {
  return new Date(START_UTC + (dayNumber - 1) * DAY_MS).toISOString().slice(0, 10);
}

/** "Thu, Oct 8, 2026" for a day number. */
export function formatDay(dayNumber, options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Date(START_UTC + (dayNumber - 1) * DAY_MS).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' });
}

/** The 4 verses for a day: [{ ref, text, answer, answerIndex }]. */
export function puzzleFor(dayNumber) {
  // If the site hasn't been rebuilt in a long time, loop back through the schedule rather than break.
  const days = schedule.days;
  const entry = days[(dayNumber - 1) % days.length];
  return entry.verses.map((ref) => {
    const answer = parseReference(ref);
    return { ref, text: verseText[ref], answer, answerIndex: referenceToIndex(answer) };
  });
}
