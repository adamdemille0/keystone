// Parses data/raw/book-of-mormon.txt and data/level-picks.json, then writes:
//   data/structure.json  - every book, with the verse count of each chapter
//   data/schedule.json   - the 4 verses for each daily game, by date
//   data/verses.json     - the text of every verse used in the schedule
//
// Days up to and including tomorrow are never changed once they're in schedule.json,
// so editing level-picks.json only affects future days. Commit schedule.json.
//
// Run with: npm run data  (also runs automatically before dev, build, and test)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const RAW_FILE = root + 'data/raw/book-of-mormon.txt';
const PICKS_FILE = root + 'data/level-picks.json';
const STRUCTURE_FILE = root + 'data/structure.json';
const SCHEDULE_FILE = root + 'data/schedule.json';
const VERSES_FILE = root + 'data/verses.json';

const EXPECTED_TOTAL = 6604;
const EXPECTED_FIRST = '1 Nephi 1:1';
const EXPECTED_LAST = 'Moroni 10:34';
const LEVEL_COUNT = 4;

const START_DATE = '2026-10-08'; // Day #1. Don't change after launch.
const DAYS_AHEAD = 365; // How far past today to schedule.
const DAY_MS = 24 * 60 * 60 * 1000;

// Matches verse marker lines such as "1 Nephi 1:1", "Alma 32:21", "Words of Mormon 1:7".
const MARKER = /^((?:\d )?[A-Z][a-z]+(?: of [A-Z][a-z]+)?) (\d+):(\d+)$/;
// Matches any reference typed in level-picks.json.
const REFERENCE = /^(.+?) (\d+):(\d+)$/;

function fail(message) {
  console.error(`\nbuild-data FAILED: ${message}\n`);
  process.exit(1);
}

// ---------- Parse the source text ----------

function parseSource() {
  const lines = readFileSync(RAW_FILE, 'utf8').split(/\r?\n/).map((l) => l.trimEnd());

  // Everything before 1 Nephi 1:1 is Gutenberg front matter, title page, and witnesses.
  const start = lines.indexOf(EXPECTED_FIRST);
  if (start === -1) fail(`could not find "${EXPECTED_FIRST}" in ${RAW_FILE}`);

  const verses = []; // { book, chapter, verse, text } in reading order
  let prev = null;

  for (let i = start; i < lines.length; i++) {
    const m = lines[i].match(MARKER);
    if (!m) continue; // book intros, "Chapter N" headings, blank lines

    const book = m[1];
    const chapter = Number(m[2]);
    const verse = Number(m[3]);
    const ref = `${book} ${chapter}:${verse}`;

    // Every verse must follow the previous one with no gaps.
    if (prev) {
      const nextVerse = prev.book === book && prev.chapter === chapter && verse === prev.verse + 1;
      const nextChapter = prev.book === book && chapter === prev.chapter + 1 && verse === 1;
      const nextBook = prev.book !== book && chapter === 1 && verse === 1;
      if (!nextVerse && !nextChapter && !nextBook) {
        fail(`verses out of order at line ${i + 1}: ${prev.book} ${prev.chapter}:${prev.verse} -> ${ref}`);
      }
    }

    // Verse text runs until the next blank line and starts with " <verse number> ".
    const textLines = [];
    for (let j = i + 1; j < lines.length && lines[j].trim() !== ''; j++) textLines.push(lines[j]);
    const joined = textLines.join(' ').replace(/\s+/g, ' ').trim();
    const prefix = `${verse} `;
    if (!joined.startsWith(prefix)) fail(`text for ${ref} (line ${i + 2}) does not start with "${prefix}"`);

    const entry = { book, chapter, verse, text: joined.slice(prefix.length) };
    verses.push(entry);
    prev = entry;
  }

  return verses;
}

function buildStructure(verses) {
  const books = [];
  for (const { book, chapter, verse } of verses) {
    let b = books[books.length - 1];
    if (!b || b.name !== book) {
      b = { name: book, chapters: [] };
      books.push(b);
    }
    b.chapters[chapter - 1] = verse; // last verse seen in a chapter = its verse count
  }
  return { totalVerses: verses.length, books };
}

// ---------- Sanity checks ----------

function checkSanity(verses) {
  const refOf = (v) => `${v.book} ${v.chapter}:${v.verse}`;
  const first = refOf(verses[0]);
  const last = refOf(verses[verses.length - 1]);

  console.log(`Total verses: ${verses.length}`);
  console.log(`First verse:  ${first}`);
  console.log(`Last verse:   ${last}`);

  if (first !== EXPECTED_FIRST) fail(`first verse is ${first}, expected ${EXPECTED_FIRST}`);
  if (last !== EXPECTED_LAST) fail(`last verse is ${last}, expected ${EXPECTED_LAST}`);
  if (verses.length !== EXPECTED_TOTAL) fail(`found ${verses.length} verses, expected ${EXPECTED_TOTAL}`);
}

// ---------- Level picks ----------

/** Reads level-picks.json and returns four lists of clean references. */
function readPicks(textByRef) {
  let picks;
  try {
    picks = JSON.parse(readFileSync(PICKS_FILE, 'utf8'));
  } catch (err) {
    fail(`could not read ${PICKS_FILE}: ${err.message}`);
  }

  const errors = [];
  const levels = [];

  for (let n = 1; n <= LEVEL_COUNT; n++) {
    const key = `level${n}`;
    const refs = picks[key];
    if (!Array.isArray(refs) || refs.length === 0) {
      errors.push(`"${key}" must be a non-empty list of references`);
      continue;
    }

    const seen = new Set();
    const level = [];
    for (const raw of refs) {
      const m = String(raw).trim().match(REFERENCE);
      const ref = m ? `${m[1]} ${Number(m[2])}:${Number(m[3])}` : String(raw);
      if (!textByRef.has(ref)) {
        errors.push(`${key}: "${raw}" is not a real verse reference`);
        continue;
      }
      if (seen.has(ref)) {
        errors.push(`${key}: "${ref}" is listed twice`);
        continue;
      }
      seen.add(ref);
      level.push(ref);
    }
    levels.push(level);
  }

  if (errors.length) fail(`problems in ${PICKS_FILE}:\n  - ${errors.join('\n  - ')}`);

  levels.forEach((l, i) => console.log(`Level ${i + 1}: ${l.length} verses`));
  return levels;
}

// ---------- Daily schedule ----------

function dateToIndex(date) {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(START_DATE + 'T00:00:00Z')) / DAY_MS);
}

function indexToDate(index) {
  return new Date(Date.parse(START_DATE + 'T00:00:00Z') + index * DAY_MS).toISOString().slice(0, 10);
}

// Small seeded random number generator (mulberry32), so the schedule is the same on every build.
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(list, seed) {
  const random = seededRandom(seed);
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Each level works through its list in a shuffled order, using every verse once before repeating.
// `earlierDays` are the days already scheduled. Verses they showed earlier in the same cycle are skipped,
// so editing a list mid-cycle (when some of the cycle's days are locked) doesn't bring a verse back early.
function pickForDay(levelLists, dayIndex, earlierDays) {
  return levelLists.map((list, level) => {
    const n = list.length;
    const cycle = Math.floor(dayIndex / n);
    const shown = new Set(earlierDays.slice(cycle * n, dayIndex).map((d) => d.verses[level]));
    const order = shuffled(list, level * 100000 + cycle);
    const remaining = order.filter((ref) => !shown.has(ref));
    if (!remaining.length) return order[dayIndex % n];
    // Don't show the same verse two days in a row across a cycle boundary.
    const yesterday = earlierDays[dayIndex - 1]?.verses[level];
    return remaining[0] === yesterday && remaining.length > 1 ? remaining[1] : remaining[0];
  });
}

function buildSchedule(levelLists, textByRef) {
  let existing = [];
  if (existsSync(SCHEDULE_FILE)) {
    const saved = JSON.parse(readFileSync(SCHEDULE_FILE, 'utf8'));
    if (saved.start !== START_DATE) {
      fail(`schedule.json starts on ${saved.start} but START_DATE is ${START_DATE}`);
    }
    existing = saved.days;
  }

  // Keep every saved day through tomorrow (UTC), since some time zones are already a day ahead.
  const todayIndex = dateToIndex(new Date().toISOString().slice(0, 10));
  const lockedThrough = todayIndex + 1;
  const lastIndex = Math.max(todayIndex, 0) + DAYS_AHEAD;

  const days = [];
  for (let i = 0; i <= lastIndex; i++) {
    const saved = existing[i];
    const verses = i <= lockedThrough && saved ? saved.verses : pickForDay(levelLists, i, days);
    for (const ref of verses) {
      if (!textByRef.has(ref)) fail(`schedule.json day ${i + 1} uses "${ref}", which is not a real verse`);
    }
    days.push({ day: i + 1, date: indexToDate(i), verses });
  }

  const used = [...new Set(days.flatMap((d) => d.verses))].sort();
  const verseText = Object.fromEntries(used.map((ref) => [ref, textByRef.get(ref)]));

  console.log(`Schedule: day 1 (${days[0].date}) through day ${days.length} (${days[days.length - 1].date})`);
  return { schedule: { start: START_DATE, days }, verseText };
}

function scheduleJson(schedule) {
  // One day per line, so changes are easy to read in a diff.
  const lines = schedule.days.map((d) => '    ' + JSON.stringify(d));
  return `{\n  "start": ${JSON.stringify(schedule.start)},\n  "days": [\n${lines.join(',\n')}\n  ]\n}\n`;
}

// ---------- Main ----------

const verses = parseSource();
checkSanity(verses);
const structure = buildStructure(verses);
const textByRef = new Map(verses.map((v) => [`${v.book} ${v.chapter}:${v.verse}`, v.text]));
const levelLists = readPicks(textByRef);
const { schedule, verseText } = buildSchedule(levelLists, textByRef);

writeFileSync(STRUCTURE_FILE, JSON.stringify(structure, null, 2) + '\n');
writeFileSync(SCHEDULE_FILE, scheduleJson(schedule));
writeFileSync(VERSES_FILE, JSON.stringify(verseText, null, 2) + '\n');
console.log(`Wrote data/structure.json, data/schedule.json, data/verses.json`);
