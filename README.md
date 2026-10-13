# Keystone

A daily mobile-friendly browser game: read a Book of Mormon verse, then guess its book, chapter, and verse.
Each day's game has 4 levels worth 100, 200, 300, and 400 points (1,000 total).

## Daily games

- Everyone gets the same 4 verses on a given date. Day #1 is October 8, 2026, and a new game starts at
  midnight in the player's own time zone.
- **Past games** lists every day from launch to today. Players can play any day they missed.
- A finished day can't be replayed; opening it shows the result. Progress is saved after every level,
  so leaving mid-game resumes where you left off.
- Results live in the player's browser (localStorage), so they don't carry over between devices.
- **Test mode (currently OFF):** setting `TEST_MODE` to `true` at the top of `src/storage.js` keeps
  results in memory only, so refreshing the page lets you replay any day. Keep it `false` when live.
- **Share result** copies a spoiler-free summary (e.g. `Keystone #12 · Record Keeper · 812/1,000` plus one emoji per level).

## Streaks, records, and badges

All worked out from the saved results in `src/progress.js`; nothing extra is needed from a server.

- **Day streak:** consecutive days on which that day's game was finished on that day. Catching up through
  Past games doesn't count toward it. Missing today doesn't break the streak until midnight.
- **Points, last 7 days:** today's game plus the 6 before it, including ones caught up on later.
- **Title:** every final score gets one (`TITLES` in `src/scoring.js`): Seeker, Searcher, Student,
  Scholar, Record Keeper, Keystone.
- **Personal records** (Records & badges screen): best game, best 7 days, longest streak, exact verses
  found, and best score on each level. Beating one shows a "New personal record" banner (not on someone's
  first game).
- **Badges (61):** defined in `src/badges.js`, in five groups: showing up (games played, Iron Rod streaks,
  Full Week, Sabbath Keeper, Welcome Back, Searcher of Records, Missionary shares), getting better (ranks,
  exact verses, titles, Perfect Game, Mountain Climber, Personal Best), book stamps (one per book),
  collections (Every Book, Small Plates, Tiny Books, famous chapters), and special days (Christmas,
  Easter, General Conference, Pioneer). New badges are celebrated once, after finishing a game or sharing.
  Because badges are worked out from saved history, adding a badge awards it for past games too (except
  shares and play dates, which are only recorded from when they were added).
- **Next badge:** the final screen suggests the closest badge earned just by playing (never a guessing badge).
- Art lives in `public/badges/<id>.svg` (a test checks every badge has art). Every book must appear in
  `level-picks.json`, or Every Book can't be earned (a test checks this too).

## Running locally

```sh
npm install
npm run dev      # start the dev server
npm test         # run unit tests
npm run build    # build static files into dist/
npm run preview  # serve the built dist/ folder
```

`dev`, `build`, and `test` all run `npm run data` first, so the data files are always up to date.

## Choosing verses

Edit **`data/level-picks.json`**. It has four lists of references (`level1` to `level4`).

```json
{ "level1": ["1 Nephi 3:7", "Alma 32:21"], "level2": [...], "level3": [...], "level4": [...] }
```

Then run `npm run data`. It assigns verses to each date in **`data/schedule.json`** (a year ahead) and
writes their text to `data/verses.json`. Within each level, every verse is used once (in shuffled order)
before any repeats, so a level with 15 verses repeats every 15 days.

- **Past days never change.** Days up to and including tomorrow are kept exactly as they are in
  `schedule.json`. Editing your lists only reshuffles days after that.
- **Commit `schedule.json`** after running the script, so the live site keeps the same past days.
- To see what's coming up, open `schedule.json`: there's one line per day with its date and 4 verses.
- The script stops with an error if a reference doesn't exist (e.g. `Alma 70:1`) or is listed twice.
- **Every verse also needs a context paragraph** in `data/verse-context.json`: who is speaking, to whom,
  what they're saying, and the main point, in 5 to 6 sentences, with links to the Come, Follow Me lesson
  and Book of Mormon Student Manual chapter it draws on. Players see it in a "Context" dropdown after
  each guess. `npm test` fails if a verse in `level-picks.json` has no context.
- The day-1 date is `START_DATE` in `scripts/build-data.mjs`. Don't change it after launch.

## How it works

| File | Purpose |
| --- | --- |
| `data/raw/book-of-mormon.txt` | Source text (Project Gutenberg edition). Used only at build time, never shipped to the browser. |
| `scripts/build-data.mjs` | Parses the source, runs sanity checks (6,604 verses, 1 Nephi 1:1 through Moroni 10:34), and writes the three files below. |
| `data/structure.json` | Generated. Every book with its verse count per chapter. Fills the dropdowns and converts references to verse numbers. |
| `data/schedule.json` | Generated, but past days are preserved. The 4 verses for each date. |
| `data/verses.json` | Generated. The text of every verse used in the schedule. |
| `src/reference.js` | Converts between a reference (`Alma 32:21`) and a verse index (0 to 6603). |
| `src/scoring.js` | Scoring. **`K`** at the top controls how steeply points fall off with distance. |
| `src/daily.js` | Day numbers, dates, and each day's puzzle. |
| `src/storage.js` | Each day's progress and results, the date each game was finished, and which badge reveals have been shown (localStorage). |
| `src/progress.js` | Streaks, 7-day points, and personal records. |
| `src/badges.js` | Every badge and how it's earned, plus the "next badge" suggestion. |
| `src/share.js` | The share text and share/copy button. |
| `src/main.js` | Screens and UI. |
| `brand/keystone-logo.png` | Original logo (not shipped). |
| `scripts/make-brand-images.ps1` | Builds `public/logo.jpg` and the app icons from the original logo. Run on Windows with `powershell -ExecutionPolicy Bypass -File scripts/make-brand-images.ps1`. |

### Look and feel

Times New Roman throughout, with colors taken from the logo (defined at the top of `src/style.css`):
navy `#162840` for text and buttons, tan `#F5EFE4` for the background, and gold `#B99854` for thin
accent lines only (it's too light to read as text on tan).

### Scoring

Verses are numbered 0 to 6603 and arranged in a circle, so Moroni 10:34 is next to 1 Nephi 1:1.

```
distance = shortest way around the circle between guess and answer
fraction = distance / 3302          (0 = exact, 1 = opposite side)
score    = round(maxPoints * (1 - fraction) ** K)
```

At `K = 2`, a 100-point level gives: exact 100, an eighth of the circle off (about 825 verses) 56,
a quarter off 25, opposite side 0. Raise `K` to make scoring harsher, lower it to make it gentler.

**Hint:** on any level, a player can tap the hint button twice to see the chapter and verse, leaving only
the book to guess. That level is then worth a quarter of its points (`HINT_FACTOR`) and there's no exact-verse bonus. The hint is saved as
soon as it's shown, so leaving and coming back doesn't undo it. A right-book guess with a hint is ranked
"Right book", so it earns book stamps but not exact-verse or chapter badges. It shows as 💡 when shared.

An exact verse earns an extra `EXACT_BONUS` (75) points on top. Totals are still shown out of 1,000,
so a great day can go over. Each guess is also ranked: Exact, Same chapter, Same book, Close (wrong book
but within `CLOSE_VERSES`, 250 verses), or Cold.

## Deploying to Cloudflare Pages

1. Push this repo to GitHub or GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, and pick the repo.
3. Build settings:
   - **Framework preset:** None (or Vite)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save and deploy. Each push to the main branch redeploys.

The Node version comes from `.nvmrc`. No backend or environment variables are needed.
