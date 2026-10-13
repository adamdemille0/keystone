import { describe, it, expect } from 'vitest';
import picks from '../data/level-picks.json';
import verseContext from '../data/verse-context.json';

describe('verse context', () => {
  const refs = Object.values(picks).flat();

  it('has a context paragraph for every verse in the lists', () => {
    expect(refs.filter((ref) => !verseContext[ref])).toEqual([]);
  });

  it('keeps each paragraph to about 5 or 6 sentences of plain text', () => {
    for (const ref of refs) {
      const { context } = verseContext[ref] ?? { context: '' };
      const sentences = (context.match(/[.!?](\s|$)/g) ?? []).length;
      expect(sentences, ref).toBeGreaterThanOrEqual(4);
      expect(sentences, ref).toBeLessThanOrEqual(7);
      expect(context, ref).not.toMatch(/\n|\*\*|#/);
    }
  });

  it('cites Church manuals as sources', () => {
    for (const ref of refs) {
      const sources = verseContext[ref]?.sources ?? [];
      expect(sources.length, ref).toBeGreaterThan(0);
      for (const url of sources) expect(url, ref).toMatch(/^https:\/\/www\.churchofjesuschrist\.org\/study\/manual\//);
    }
  });
});
