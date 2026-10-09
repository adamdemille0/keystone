// Converts between verse references and verse indexes.
// Index 0 is 1 Nephi 1:1 and index TOTAL_VERSES - 1 is Moroni 10:34.

import structure from '../data/structure.json';

export const BOOKS = structure.books; // [{ name, chapters: [verseCount, ...] }]
export const TOTAL_VERSES = structure.totalVerses;

// chapterStart[b][c] = index of verse 1 in book b, chapter c (both 0-based here).
const chapterStart = [];
let running = 0;
for (const book of BOOKS) {
  const starts = [];
  for (const verseCount of book.chapters) {
    starts.push(running);
    running += verseCount;
  }
  chapterStart.push(starts);
}

function findBook(name) {
  const b = BOOKS.findIndex((book) => book.name === name);
  if (b === -1) throw new Error(`Unknown book: ${name}`);
  return b;
}

/** Number of chapters in a book. */
export function chapterCount(bookName) {
  return BOOKS[findBook(bookName)].chapters.length;
}

/** Number of verses in a chapter (chapter is 1-based). */
export function verseCount(bookName, chapter) {
  const count = BOOKS[findBook(bookName)].chapters[chapter - 1];
  if (count === undefined) throw new Error(`${bookName} has no chapter ${chapter}`);
  return count;
}

/** { book: "Alma", chapter: 32, verse: 21 } -> index */
export function referenceToIndex({ book, chapter, verse }) {
  const b = findBook(book);
  if (verse < 1 || verse > verseCount(book, chapter)) {
    throw new Error(`${book} ${chapter} has no verse ${verse}`);
  }
  return chapterStart[b][chapter - 1] + verse - 1;
}

/** index -> { book, chapter, verse } */
export function indexToReference(index) {
  if (!Number.isInteger(index) || index < 0 || index >= TOTAL_VERSES) {
    throw new Error(`Verse index out of range: ${index}`);
  }
  for (let b = BOOKS.length - 1; b >= 0; b--) {
    const starts = chapterStart[b];
    if (index < starts[0]) continue;
    for (let c = starts.length - 1; c >= 0; c--) {
      if (index >= starts[c]) {
        return { book: BOOKS[b].name, chapter: c + 1, verse: index - starts[c] + 1 };
      }
    }
  }
}

/** "Alma 32:21" -> { book: "Alma", chapter: 32, verse: 21 } */
export function parseReference(text) {
  const m = String(text).trim().match(/^(.+?) (\d+):(\d+)$/);
  if (!m) throw new Error(`Not a verse reference: ${text}`);
  return { book: m[1], chapter: Number(m[2]), verse: Number(m[3]) };
}

/** { book, chapter, verse } -> "Alma 32:21" */
export function formatReference({ book, chapter, verse }) {
  return `${book} ${chapter}:${verse}`;
}
