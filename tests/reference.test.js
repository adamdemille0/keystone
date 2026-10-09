import { describe, it, expect } from 'vitest';
import {
  BOOKS,
  TOTAL_VERSES,
  referenceToIndex,
  indexToReference,
  parseReference,
  formatReference,
} from '../src/reference.js';

describe('verse structure', () => {
  it('has 6604 verses in 15 books', () => {
    expect(TOTAL_VERSES).toBe(6604);
    expect(BOOKS).toHaveLength(15);
  });

  it('starts at 1 Nephi 1:1 and ends at Moroni 10:34', () => {
    expect(formatReference(indexToReference(0))).toBe('1 Nephi 1:1');
    expect(formatReference(indexToReference(TOTAL_VERSES - 1))).toBe('Moroni 10:34');
  });
});

describe('index conversion', () => {
  it('round-trips every verse: index -> reference -> index', () => {
    for (let i = 0; i < TOTAL_VERSES; i++) {
      const ref = indexToReference(i);
      expect(referenceToIndex(ref)).toBe(i);
      expect(referenceToIndex(parseReference(formatReference(ref)))).toBe(i);
    }
  });

  it('round-trips every verse: reference -> index -> reference', () => {
    let expected = 0;
    for (const book of BOOKS) {
      book.chapters.forEach((verses, c) => {
        for (let v = 1; v <= verses; v++) {
          const ref = { book: book.name, chapter: c + 1, verse: v };
          const index = referenceToIndex(ref);
          expect(index).toBe(expected++);
          expect(indexToReference(index)).toEqual(ref);
        }
      });
    }
    expect(expected).toBe(TOTAL_VERSES);
  });

  it('rejects references that do not exist', () => {
    expect(() => referenceToIndex(parseReference('Alma 70:1'))).toThrow();
    expect(() => referenceToIndex(parseReference('Enos 1:28'))).toThrow();
    expect(() => referenceToIndex(parseReference('Nephi 1:1'))).toThrow();
    expect(() => indexToReference(TOTAL_VERSES)).toThrow();
    expect(() => indexToReference(-1)).toThrow();
  });
});
