import { dateKey, puzzleFor } from '../src/daily.js';

/**
 * Saved results for day n's game, guessing every verse exactly ('exact'), one verse off in the same
 * chapter ('chapter'), or far away in the wrong book ('cold').
 */
export function guessed(n, kind) {
  const results = puzzleFor(n).map(({ ref, answer }, i) => {
    if (kind === 'exact') return { guessRef: ref, distance: 0, points: 100 * (i + 1) + 75 };
    if (kind === 'chapter') {
      const verse = answer.verse === 1 ? 2 : answer.verse - 1;
      return { guessRef: `${answer.book} ${answer.chapter}:${verse}`, distance: 1, points: 100 * (i + 1) - 1 };
    }
    // The opposite end of the Book of Mormon is the wrong book for every verse used.
    const far = answer.book === '1 Nephi' || answer.book === '2 Nephi' ? 'Alma 30:1' : '1 Nephi 1:1';
    return { guessRef: far, distance: 3000, points: 1 };
  });
  return { [dateKey(n)]: results };
}

/** Saved results for several days, all of one kind. */
export function guessedDays(dayNumbers, kind) {
  return Object.assign({}, ...dayNumbers.map((n) => guessed(n, kind)));
}
