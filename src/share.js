// Wordle-style share text that shows how close each guess was without giving away the verses.

import { titleFor } from './scoring.js';

export function levelEmoji(points, max) {
  const share = points / max;
  if (share >= 1) return '🎯'; // exact guesses also get a bonus, so they can be over max
  if (share >= 0.9) return '🟩';
  if (share >= 0.5) return '🟨';
  if (share >= 0.1) return '🟧';
  return '🟥';
}

export function shareText(dayNumber, results, maxTotal, url) {
  const total = results.reduce((sum, r) => sum + r.points, 0);
  const emojis = results.map((r) => (r.hint ? '💡' : levelEmoji(r.points, r.max))).join('');
  return `Keystone #${dayNumber} · ${titleFor(total)} · ${total}/${maxTotal.toLocaleString()}\n${emojis}\n${url}`;
}

/** Opens the phone's share sheet, or copies to the clipboard. Returns 'shared', 'cancelled', 'copied', or 'failed'. */
export async function shareResult(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'; // user closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
