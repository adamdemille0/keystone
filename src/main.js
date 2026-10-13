import './style.css';
import { BOOKS, chapterCount, verseCount, referenceToIndex, formatReference } from './reference.js';
import {
  circularDistance,
  levelPoints,
  rankOfResult,
  titleFor,
  LEVEL_MAX_POINTS,
  EXACT_BONUS,
  HINT_FACTOR,
} from './scoring.js';
import { todayNumber, dateKey, formatDay, puzzleFor } from './daily.js';
import {
  loadDay,
  saveDay,
  isComplete,
  totalOf,
  loadStats,
  loadProgress,
  loadBadgesShown,
  markBadgesShown,
  loadShares,
  addShare,
  hintShown,
  saveHintShown,
  TEST_MODE,
} from './storage.js';
import { streak, recentPoints, records, newRecords, RECORD_LABELS } from './progress.js';
import { badgeStats, earnedBadges, nextBadge, BADGES, GROUPS } from './badges.js';
import { shareText, shareResult } from './share.js';
import verseContext from '../data/verse-context.json';

const app = document.getElementById('app');
const MAX_TOTAL = LEVEL_MAX_POINTS.reduce((a, b) => a + b, 0);
const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const COUNT_MS = 900; // how long points take to count up; keep in step with the animations in style.css

// The game being played
let day = 0; // day number (1 = launch day)
let puzzle = []; // from puzzleFor(day)
let results = []; // { guessRef, distance, points, max, bonus }, one per finished level

// ---------- Helpers ----------

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const LOGO = '<img src="/logo.jpg" alt="Keystone: Daily Book of Mormon Search" width="1000" height="193" />';

function show(html, { withHeader = true } = {}) {
  const header = withHeader
    ? `<header class="top-bar"><button class="logo-button" id="logo-home" aria-label="Keystone home">${LOGO}</button></header>`
    : '';
  app.innerHTML = header + html;
  window.scrollTo(0, 0);
  on('logo-home', showHome);
  app.querySelector('h1, h2')?.focus();
}

function on(id, handler) {
  document.getElementById(id)?.addEventListener('click', handler);
}

function describeDistance(distance) {
  if (distance === 0) return 'Right on the verse';
  if (distance === 1) return '1 verse away';
  return `${distance.toLocaleString()} verses away`;
}

function numberOptions(count) {
  let html = '';
  for (let n = 1; n <= count; n++) html += `<option value="${n}">${n}</option>`;
  return html;
}

/** Counts an element's number up from 0 to `to`, easing out. */
function countUp(id, to) {
  const el = document.getElementById(id);
  if (!el) return;
  if (REDUCE_MOTION) {
    el.textContent = to.toLocaleString();
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / COUNT_MS);
    el.textContent = Math.round(to * (1 - (1 - t) ** 3)).toLocaleString();
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** A big number that counts up; screen readers get the final value straight away. */
function countingNumber(id, value, ofText, animate) {
  return `<span class="sr-only">${value.toLocaleString()} ${ofText.replace('/', 'out of')}</span><span aria-hidden="true"><span id="${id}">${(animate ? 0 : value).toLocaleString()}</span> <span class="of">${ofText}</span></span>`;
}

function statsLine() {
  const stats = loadStats();
  if (!stats.played) return '';
  return `<p class="stats">Best score: <strong>${stats.best.toLocaleString()}</strong> · Games played: <strong>${stats.played}</strong></p>`;
}

/** Current streak and points from the last 7 days. `celebrate` makes the streak pop. */
function progressPanel(celebrate = false) {
  const today = todayNumber();
  const { days, finishedOn } = loadProgress();
  const streakDays = streak(today, days, finishedOn);
  const weekPoints = recentPoints(today, days);
  return `
    <div class="progress">
      <div><p class="big${celebrate && streakDays ? ' pop' : ''}">${streakDays}</p><p class="label">Day streak</p></div>
      <div><p class="big">${weekPoints.toLocaleString()}</p><p class="label">Points, last 7 days</p></div>
    </div>`;
}

// ---------- Home ----------

function showHome() {
  const today = todayNumber();

  if (today < 1) {
    show(
      `
      <section class="screen home">
        <h1 class="logo" tabindex="-1">${LOGO}</h1>
        <p class="tagline">The first daily game starts ${formatDay(1, { month: 'long', day: 'numeric' })}.</p>
      </section>
    `,
      { withHeader: false },
    );
    return;
  }

  const saved = loadDay(dateKey(today));
  const label = isComplete(saved)
    ? "See today's result"
    : saved.length
      ? `Continue today's game (level ${saved.length + 1})`
      : "Play today's game";
  const played = loadStats().played > 0;

  show(
    `
    <section class="screen home">
      <h1 class="logo" tabindex="-1">${LOGO}</h1>
      <div class="rule"></div>
      <p class="eyebrow">Day ${today} · ${formatDay(today)}</p>
      <p class="tagline">Read a verse from the Book of Mormon. Guess where it's from.</p>
      <ul class="rules">
        <li>A new game every day: 4 verses worth ${LEVEL_MAX_POINTS.join(', ')} points.</li>
        <li>The closer your guess, the more points you earn. Exact verses earn +${EXACT_BONUS}.</li>
        <li>Stuck? A hint shows the chapter and verse, for a quarter of the points.</li>
        <li>Moroni wraps back around to 1 Nephi.</li>
      </ul>
      <button class="primary" id="play-today">${label}</button>
      <button class="secondary" id="archive">Past games</button>
      ${played ? '<button class="secondary" id="records">Records &amp; badges</button>' : ''}
      ${played ? progressPanel() : ''}
      ${statsLine()}
      ${TEST_MODE ? '<p class="test-badge">Test mode: results reset when you refresh</p>' : ''}
    </section>
  `,
    { withHeader: false },
  );
  on('play-today', () => openDay(today));
  on('archive', showArchive);
  on('records', showRecords);
}

// ---------- Archive ----------

function showArchive() {
  const today = todayNumber();
  let rows = '';
  for (let n = today; n >= 1; n--) {
    const saved = loadDay(dateKey(n));
    const status = isComplete(saved)
      ? `<span class="score">${totalOf(saved)}</span>`
      : saved.length
        ? '<span class="muted">In progress</span>'
        : '<span class="play">Play</span>';
    rows += `
      <li>
        <button class="day-row" data-day="${n}">
          <span><strong>#${n}</strong> ${formatDay(n)}${n === today ? ' <span class="muted">(today)</span>' : ''}</span>
          ${status}
        </button>
      </li>`;
  }

  show(`
    <section class="screen archive">
      <button class="back-link" id="back-home">‹ Home</button>
      <h2 tabindex="-1">Past games</h2>
      <ul class="day-list">${rows}</ul>
      <button class="secondary" id="home">Home</button>
    </section>
  `);
  on('back-home', showHome);
  on('home', showHome);
  app.querySelectorAll('.day-row').forEach((button) => {
    button.addEventListener('click', () => openDay(Number(button.dataset.day)));
  });
}

// ---------- Records and badges ----------

function currentBadgeStats() {
  const { days, finishedOn } = loadProgress();
  return badgeStats(todayNumber(), days, finishedOn, loadShares());
}

function badgeImg(id, size = 120) {
  return `<img src="/badges/${id}.svg" alt="" width="${size}" height="${size}" />`;
}

function progressNote(badge, stats) {
  if (!badge.progress) return '';
  const [have, need] = badge.progress(stats);
  return ` (${Math.min(have, need)} of ${need})`;
}

function badgeTile(badge, earned, note, count = '') {
  return `
    <li class="badge${earned ? '' : ' locked'}">
      ${badgeImg(badge.id)}
      <p class="badge-name">${badge.name}</p>
      ${count ? `<p class="badge-count">${count}</p>` : ''}
      <p class="muted">${note}</p>
    </li>`;
}

/** One tile per badge, except a series (5 games, 10 games, ...) gets one tile: its highest tier earned, and what's next. */
function badgeTiles(group, stats) {
  const badges = BADGES.filter((b) => b.group === group);
  return badges
    .map((b) => {
      if (!b.series) {
        const earned = b.earned(stats);
        return badgeTile(b, earned, earned ? 'Earned' : b.description + progressNote(b, stats));
      }
      if (b.tier !== 1) return '';
      const tiers = badges.filter((t) => t.series === b.series);
      const earned = tiers.filter((t) => t.earned(stats));
      const top = earned.at(-1);
      const next = tiers.find((t) => !t.earned(stats));
      const note = !next
        ? 'All earned'
        : (top ? `Next: ${next.name}` : next.description) + progressNote(next, stats);
      return badgeTile(top ?? b, Boolean(top), note, `${earned.length} of ${tiers.length}`);
    })
    .join('');
}

function bookStamps(stats) {
  return BADGES.filter((b) => b.group === 'books')
    .map((b) => {
      const earned = b.earned(stats);
      return `<li class="${earned ? '' : 'locked'}"><img src="/badges/${b.id}.svg" alt="${b.name}${earned ? '' : ' (not yet)'}" width="64" height="64" /></li>`;
    })
    .join('');
}

function showRecords() {
  const today = todayNumber();
  const { days, finishedOn } = loadProgress();
  const rec = records(today, days, finishedOn);
  const stats = currentBadgeStats();
  const earnedCount = earnedBadges(stats).length;

  const groups = GROUPS.map(
    (g) => `
      <h3 class="group-name">${g.name}</h3>
      ${
        g.id === 'books'
          ? `<p class="muted group-note">${stats.books.size} of ${BOOKS.length} stamps. Guess the right book for a verse to collect its stamp.</p>
             <ul class="stamp-grid">${bookStamps(stats)}</ul>`
          : `<ul class="badge-grid">${badgeTiles(g.id, stats)}</ul>`
      }`,
  ).join('');

  const dayCount = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;
  const rows = [
    ['Best game', rec.bestGame.toLocaleString()],
    ['Best 7 days', rec.bestWeek.toLocaleString()],
    ['Current streak', dayCount(stats.currentStreak)],
    ['Longest streak', dayCount(rec.longestStreak)],
    ['Exact verses found', rec.exactVerses],
    ...rec.levelBest.map((points, i) => [`Best on level ${i + 1}`, `${points} <span class="muted">/ ${LEVEL_MAX_POINTS[i]}</span>`]),
    ['Games played', loadStats().played],
  ]
    .map(([label, value]) => `<tr><th scope="row">${label}</th><td class="num">${value}</td></tr>`)
    .join('');

  show(`
    <section class="screen records">
      <button class="back-link" id="back-home">‹ Home</button>
      <h2 tabindex="-1">Records &amp; badges</h2>
      <p class="eyebrow">Badges · ${earnedCount} of ${BADGES.length}</p>
      ${groups}
      <p class="eyebrow">Personal records</p>
      <table class="breakdown record-table"><tbody>${rows}</tbody></table>
      <button class="secondary" id="home">Home</button>
    </section>
  `);
  on('back-home', showHome);
  on('home', showHome);
}

/** Celebrates any badges earned but not shown yet: one badge gets the full reveal, several appear together. */
function revealNewBadges() {
  const shown = loadBadgesShown();
  const ids = earnedBadges(currentBadgeStats()).filter((id) => !shown[id]);
  if (!ids.length || document.querySelector('.badge-reveal')) return;
  markBadgesShown(ids);
  const badges = ids.map((id) => BADGES.find((b) => b.id === id));

  const body =
    badges.length === 1
      ? `<p class="eyebrow">Badge earned</p>
         <div class="badge-burst">${badgeImg(badges[0].id, 160)}</div>
         <h2 id="badge-title">${badges[0].name}</h2>
         <p class="muted">${badges[0].description}</p>`
      : `<p class="eyebrow">Badges earned</p>
         <h2 id="badge-title">${badges.length} new badges!</h2>
         <ul class="reveal-grid">${badges
           .map((b, i) => `<li style="--i: ${i}">${badgeImg(b.id, 84)}<span>${b.name}</span></li>`)
           .join('')}</ul>`;

  const overlay = document.createElement('div');
  overlay.className = 'badge-reveal';
  overlay.innerHTML = `
    <div class="badge-reveal-card" role="dialog" aria-modal="true" aria-labelledby="badge-title">
      ${body}
      <button class="primary" id="badge-continue">Continue</button>
    </div>`;
  document.body.appendChild(overlay);

  const button = overlay.querySelector('#badge-continue');
  const close = () => {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  button.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  button.focus();
}

// ---------- Playing a day ----------

function openDay(dayNumber) {
  day = dayNumber;
  puzzle = puzzleFor(day);
  results = loadDay(dateKey(day));
  if (isComplete(results)) {
    showFinal(false);
  } else {
    showLevel();
  }
}

function showLevel() {
  const level = results.length;
  const { text, answer } = puzzle[level];
  const hint = hintShown(dateKey(day), level);
  const max = LEVEL_MAX_POINTS[level] * (hint ? HINT_FACTOR : 1);
  const bookOptions = BOOKS.map((b) => `<option>${escapeHtml(b.name)}</option>`).join('');
  show(`
    <section class="screen level">
      <header class="level-header">
        <h2 tabindex="-1">Level ${level + 1} of 4</h2>
        <span class="pill">Up to ${max} pts${hint ? ' · hint' : ''}</span>
      </header>
      <p class="score-line">Day #${day} · Score so far: ${totalOf(results)}</p>
      <blockquote class="verse">${escapeHtml(text)}</blockquote>
      ${
        hint
          ? `<p class="hint-box"><span class="eyebrow">Hint</span><span class="hint-ref">Chapter ${answer.chapter}, verse ${answer.verse}</span>Which book is it from?</p>`
          : ''
      }
      <form id="guess-form" class="guess">
        <label>Book
          <select id="book">${bookOptions}</select>
        </label>
        ${
          hint
            ? '<p class="guess-error" id="guess-error" role="alert"></p>'
            : `<div class="row">
                <label>Chapter <select id="chapter"></select></label>
                <label>Verse <select id="verse"></select></label>
              </div>`
        }
        <button class="primary" type="submit">Submit guess</button>
        ${hint ? '' : '<button class="secondary hint-button" type="button" id="hint">Use a hint (¼ of the points)</button>'}
      </form>
    </section>
  `);

  const bookSelect = document.getElementById('book');
  const form = document.getElementById('guess-form');

  if (hint) {
    const error = document.getElementById('guess-error');
    bookSelect.addEventListener('change', () => (error.textContent = ''));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const guess = { book: bookSelect.value, chapter: answer.chapter, verse: answer.verse };
      const chapters = chapterCount(guess.book);
      if (guess.chapter > chapters || guess.verse > verseCount(guess.book, guess.chapter)) {
        error.textContent = `${guess.book} doesn't have chapter ${guess.chapter}, verse ${guess.verse}. Try another book.`;
        return;
      }
      submitGuess(guess, true);
    });
    return;
  }

  const chapterSelect = document.getElementById('chapter');
  const verseSelect = document.getElementById('verse');
  const fillVerses = () => {
    verseSelect.innerHTML = numberOptions(verseCount(bookSelect.value, Number(chapterSelect.value)));
  };
  const fillChapters = () => {
    chapterSelect.innerHTML = numberOptions(chapterCount(bookSelect.value));
    fillVerses();
  };
  bookSelect.addEventListener('change', fillChapters);
  chapterSelect.addEventListener('change', fillVerses);
  fillChapters();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitGuess({
      book: bookSelect.value,
      chapter: Number(chapterSelect.value),
      verse: Number(verseSelect.value),
    });
  });

  // Two taps, so the hint isn't used by accident.
  on('hint', (event) => {
    const button = event.currentTarget;
    if (!button.classList.contains('confirm')) {
      button.classList.add('confirm');
      button.textContent = `Tap again: show chapter and verse, for up to ${LEVEL_MAX_POINTS[level] * HINT_FACTOR} pts`;
      return;
    }
    saveHintShown(dateKey(day), level);
    showLevel();
  });
}

function submitGuess(guess, hint = false) {
  const level = results.length;
  const { answerIndex } = puzzle[level];
  const guessIndex = referenceToIndex(guess);
  const { points, bonus, max } = levelPoints(guessIndex, answerIndex, LEVEL_MAX_POINTS[level], hint);
  results.push({
    guessRef: formatReference(guess),
    distance: circularDistance(guessIndex, answerIndex),
    points,
    max,
    bonus,
    ...(hint && { hint: true }),
  });
  saveDay(dateKey(day), results, dateKey(todayNumber()));
  showResult();
}

function showResult() {
  const level = results.length - 1;
  const r = results[level];
  const bonus = r.bonus ?? 0;
  const rank = rankOfResult(r, puzzle[level].ref);
  const closeness = Math.round(((r.points - bonus) / r.max) * 100);
  const isLast = isComplete(results);
  show(`
    <section class="screen result">
      <h2 tabindex="-1">Level ${level + 1} result</h2>
      <div class="card">
        <p class="label">Correct answer</p>
        <p class="answer">${escapeHtml(puzzle[level].ref)}</p>
        <p class="label">Your guess</p>
        <p class="guess-ref">${escapeHtml(r.guessRef)}</p>
        <div class="meter" aria-hidden="true"><div class="meter-fill" style="--fill: ${closeness}%"></div></div>
        <p class="rank rank-${rank.id}">${rank.label}</p>
        <p class="distance">${describeDistance(r.distance)}</p>
        <p class="points">+${countingNumber('level-points', r.points, `/ ${r.max}`, true)}</p>
        ${bonus ? `<p class="bonus">Includes +${bonus} exact-verse bonus</p>` : ''}
        ${r.hint ? `<p class="bonus">Hint used: a quarter of the points</p>` : ''}
      </div>
      <blockquote class="verse small">${escapeHtml(puzzle[level].text)}</blockquote>
      ${contextDropdown(puzzle[level].ref)}
      <p class="score-line">Total: ${totalOf(results)}</p>
      <button class="primary" id="next">${isLast ? 'See final score' : 'Next level'}</button>
    </section>
  `);
  countUp('level-points', r.points);
  on('next', () => (isLast ? showFinal(true) : showLevel()));
}

const SOURCE_NAMES = [
  ['come-follow-me', 'Come, Follow Me'],
  ['book-of-mormon-student-manual', 'Book of Mormon Student Manual'],
];

/** A closed dropdown with who's speaking, to whom, and why, from data/verse-context.json. */
function contextDropdown(ref, label = "Context: who's speaking, and why") {
  const entry = verseContext[ref];
  if (!entry) return '';
  const links = (entry.sources ?? [])
    .map((url) => {
      const name = SOURCE_NAMES.find(([part]) => url.includes(part))?.[1];
      return name ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${name}</a>` : '';
    })
    .filter(Boolean);
  return `
    <details class="context">
      <summary>${label}</summary>
      <p>${escapeHtml(entry.context)}</p>
      ${links.length ? `<p class="context-sources">Learn more: ${links.join(' · ')}</p>` : ''}
    </details>`;
}

function showFinal(justFinished) {
  const total = totalOf(results);
  const today = todayNumber();
  const { days, finishedOn } = loadProgress();

  // Records this game beat, found by comparing against history without it.
  let beaten = [];
  if (justFinished) {
    const without = { ...days };
    delete without[dateKey(day)];
    const gamesBefore = loadStats(dateKey(day)).played;
    beaten = newRecords(records(today, without, finishedOn), records(today, days, finishedOn), gamesBefore);
  }
  const beatenLabels = beaten.map((key) => RECORD_LABELS[key] ?? `Best on level ${key.slice(-1)}`);
  const next = nextBadge(currentBadgeStats());

  const rows = results
    .map((r, i) => {
      const rank = rankOfResult(r, puzzle[i].ref);
      const context = contextDropdown(puzzle[i].ref, 'Context');
      return `
      <tr${context ? ' class="has-context"' : ''}>
        <td>${i + 1}</td>
        <td>${escapeHtml(puzzle[i].ref)}<br /><span class="muted">You: ${escapeHtml(r.guessRef)} · ${rank.label}${r.hint ? ' (hint)' : ''}</span></td>
        <td class="num">${r.points}<span class="muted">/${r.max}</span></td>
      </tr>
      ${context ? `<tr class="context-row"><td colspan="3">${context}</td></tr>` : ''}`;
    })
    .join('');

  show(`
    <section class="screen final${justFinished ? ' celebrate' : ''}">
      <h2 tabindex="-1">Day #${day} · ${formatDay(day)}</h2>
      <p class="total">${countingNumber('total-count', total, `/ ${MAX_TOTAL.toLocaleString()}`, justFinished)}</p>
      <p class="title-line"><span class="eyebrow">Your title</span><span class="title">${titleFor(total)}</span></p>
      ${
        beatenLabels.length
          ? `<div class="new-records"><p class="eyebrow">New personal ${beatenLabels.length > 1 ? 'records' : 'record'}</p><p>${beatenLabels.join(' · ')}</p></div>`
          : ''
      }
      <table class="breakdown">
        <thead><tr><th>Level</th><th>Verse</th><th class="num">Points</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${progressPanel(justFinished)}
      ${
        next
          ? `<div class="next-badge">${badgeImg(next.badge.id, 56)}<p><span class="eyebrow">Next badge</span><br /><strong>${next.badge.name}</strong>: ${next.left} more ${next.unit}</p></div>`
          : ''
      }
      <button class="primary" id="share">Share result</button>
      <button class="secondary" id="records">Records &amp; badges</button>
      <button class="secondary" id="archive">Past games</button>
      <button class="secondary" id="home">Home</button>
      ${statsLine()}
    </section>
  `);

  if (justFinished) {
    countUp('total-count', total);
    setTimeout(revealNewBadges, REDUCE_MOTION ? 0 : COUNT_MS + 900);
  }

  on('share', async (event) => {
    const button = event.currentTarget;
    const outcome = await shareResult(shareText(day, results, MAX_TOTAL, location.origin));
    if (outcome === 'shared' || outcome === 'copied') {
      addShare();
      revealNewBadges();
    }
    if (outcome === 'shared' || outcome === 'cancelled') return;
    button.textContent = outcome === 'copied' ? 'Copied to clipboard!' : "Couldn't copy, try again";
    setTimeout(() => (button.textContent = 'Share result'), 2000);
  });
  on('records', showRecords);
  on('archive', showArchive);
  on('home', showHome);
}

showHome();
