import './style.css';
import { BOOKS, chapterCount, verseCount, referenceToIndex, formatReference } from './reference.js';
import { scoreGuess, circularDistance, LEVEL_MAX_POINTS } from './scoring.js';
import { todayNumber, dateKey, formatDay, puzzleFor } from './daily.js';
import { loadDay, saveDay, isComplete, totalOf, loadStats, TEST_MODE } from './storage.js';
import { shareText, shareResult } from './share.js';

const app = document.getElementById('app');
const MAX_TOTAL = LEVEL_MAX_POINTS.reduce((a, b) => a + b, 0);

// The game being played
let day = 0; // day number (1 = launch day)
let puzzle = []; // from puzzleFor(day)
let results = []; // { guessRef, distance, points, max }, one per finished level

// ---------- Helpers ----------

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function show(html) {
  app.innerHTML = html;
  window.scrollTo(0, 0);
  app.querySelector('h1, h2')?.focus();
}

function on(id, handler) {
  document.getElementById(id)?.addEventListener('click', handler);
}

function describeDistance(distance) {
  if (distance === 0) return 'Exact!';
  if (distance === 1) return '1 verse away';
  return `${distance.toLocaleString()} verses away`;
}

function numberOptions(count) {
  let html = '';
  for (let n = 1; n <= count; n++) html += `<option value="${n}">${n}</option>`;
  return html;
}

function statsLine() {
  const stats = loadStats();
  if (!stats.played) return '';
  return `<p class="stats">Best score: <strong>${stats.best}</strong> · Games played: <strong>${stats.played}</strong></p>`;
}

// ---------- Home ----------

function showHome() {
  const today = todayNumber();

  if (today < 1) {
    show(`
      <section class="screen home">
        <h1 tabindex="-1">Keystone</h1>
        <p class="tagline">The first daily game starts ${formatDay(1, { month: 'long', day: 'numeric' })}.</p>
      </section>
    `);
    return;
  }

  const saved = loadDay(dateKey(today));
  const label = isComplete(saved)
    ? "See today's result"
    : saved.length
      ? `Continue today's game (level ${saved.length + 1})`
      : "Play today's game";

  show(`
    <section class="screen home">
      <h1 tabindex="-1">Keystone</h1>
      <p class="tagline">Read a verse from the Book of Mormon. Guess where it's from.</p>
      <p class="day-label">Day #${today} · ${formatDay(today)}</p>
      <ul class="rules">
        <li>A new game every day: 4 verses worth ${LEVEL_MAX_POINTS.join(', ')} points.</li>
        <li>The closer your guess, the more points you earn.</li>
        <li>Moroni wraps back around to 1 Nephi.</li>
      </ul>
      <button class="primary" id="play-today">${label}</button>
      <button class="secondary" id="archive">Past games</button>
      ${statsLine()}
      ${TEST_MODE ? '<p class="test-badge">Test mode: results reset when you refresh</p>' : ''}
    </section>
  `);
  on('play-today', () => openDay(today));
  on('archive', showArchive);
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
      <button class="link" id="back">← Home</button>
      <h2 tabindex="-1">Past games</h2>
      <ul class="day-list">${rows}</ul>
    </section>
  `);
  on('back', showHome);
  app.querySelectorAll('.day-row').forEach((button) => {
    button.addEventListener('click', () => openDay(Number(button.dataset.day)));
  });
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
  const { text } = puzzle[level];
  const max = LEVEL_MAX_POINTS[level];
  show(`
    <section class="screen level">
      <button class="link" id="back">← Home</button>
      <header class="level-header">
        <h2 tabindex="-1">Level ${level + 1} of 4</h2>
        <span class="pill">Up to ${max} pts</span>
      </header>
      <p class="score-line">Day #${day} · Score so far: ${totalOf(results)}</p>
      <blockquote class="verse">${escapeHtml(text)}</blockquote>
      <form id="guess-form" class="guess">
        <label>Book
          <select id="book">${BOOKS.map((b) => `<option>${escapeHtml(b.name)}</option>`).join('')}</select>
        </label>
        <div class="row">
          <label>Chapter <select id="chapter"></select></label>
          <label>Verse <select id="verse"></select></label>
        </div>
        <button class="primary" type="submit">Submit guess</button>
      </form>
    </section>
  `);
  on('back', showHome);

  const bookSelect = document.getElementById('book');
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

  document.getElementById('guess-form').addEventListener('submit', (event) => {
    event.preventDefault();
    submitGuess({
      book: bookSelect.value,
      chapter: Number(chapterSelect.value),
      verse: Number(verseSelect.value),
    });
  });
}

function submitGuess(guess) {
  const level = results.length;
  const { answerIndex } = puzzle[level];
  const guessIndex = referenceToIndex(guess);
  const max = LEVEL_MAX_POINTS[level];
  results.push({
    guessRef: formatReference(guess),
    distance: circularDistance(guessIndex, answerIndex),
    points: scoreGuess(guessIndex, answerIndex, max),
    max,
  });
  saveDay(dateKey(day), results);
  showResult();
}

function showResult() {
  const level = results.length - 1;
  const r = results[level];
  const isLast = isComplete(results);
  show(`
    <section class="screen result">
      <h2 tabindex="-1">Level ${level + 1} result</h2>
      <div class="card">
        <p class="label">Correct answer</p>
        <p class="answer">${escapeHtml(puzzle[level].ref)}</p>
        <p class="label">Your guess</p>
        <p class="guess-ref">${escapeHtml(r.guessRef)}</p>
        <p class="distance">${describeDistance(r.distance)}</p>
        <p class="points">+${r.points} <span>/ ${r.max}</span></p>
      </div>
      <blockquote class="verse small">${escapeHtml(puzzle[level].text)}</blockquote>
      <p class="score-line">Total: ${totalOf(results)}</p>
      <button class="primary" id="next">${isLast ? 'See final score' : 'Next level'}</button>
    </section>
  `);
  on('next', () => (isLast ? showFinal(true) : showLevel()));
}

function showFinal(justFinished) {
  const total = totalOf(results);
  const otherBest = loadStats(dateKey(day));
  const newBest = justFinished && otherBest.played > 0 && total > otherBest.best;

  const rows = results
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(puzzle[i].ref)}<br /><span class="muted">You: ${escapeHtml(r.guessRef)}</span></td>
        <td class="num">${r.points}<span class="muted">/${r.max}</span></td>
      </tr>`,
    )
    .join('');

  show(`
    <section class="screen final">
      <h2 tabindex="-1">Day #${day} · ${formatDay(day)}</h2>
      <p class="total">${total} <span>/ ${MAX_TOTAL.toLocaleString()}</span></p>
      ${newBest ? '<p class="new-best">New best score!</p>' : ''}
      <table class="breakdown">
        <thead><tr><th>Level</th><th>Verse</th><th class="num">Points</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <button class="primary" id="share">Share result</button>
      <button class="secondary" id="archive">Past games</button>
      <button class="secondary" id="home">Home</button>
      ${statsLine()}
    </section>
  `);

  on('share', async (event) => {
    const button = event.currentTarget;
    const outcome = await shareResult(shareText(day, results, MAX_TOTAL, location.origin));
    if (outcome === 'shared') return;
    button.textContent = outcome === 'copied' ? 'Copied to clipboard!' : "Couldn't copy, try again";
    setTimeout(() => (button.textContent = 'Share result'), 2000);
  });
  on('archive', showArchive);
  on('home', showHome);
}

showHome();
