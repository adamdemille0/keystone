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
- **Test mode (currently ON):** `TEST_MODE` at the top of `src/storage.js` keeps results in memory only,
  so refreshing the page lets you replay any day. Set it to `false` before launch.
- **Share result** copies a spoiler-free summary (e.g. `Keystone #12 · 812/1,000` plus one emoji per level).

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
| `src/storage.js` | Each day's progress and results, plus best score and games played (localStorage). |
| `src/share.js` | The share text and share/copy button. |
| `src/main.js` | Screens and UI. |
| `scripts/make-icons.mjs` | Regenerates the PNG icons in `public/icons/` (`npm run icons`). |

### Scoring

Verses are numbered 0 to 6603 and arranged in a circle, so Moroni 10:34 is next to 1 Nephi 1:1.

```
distance = shortest way around the circle between guess and answer
fraction = distance / 3302          (0 = exact, 1 = opposite side)
score    = round(maxPoints * (1 - fraction) ** K)
```

At `K = 2`, a 100-point level gives: exact 100, an eighth of the circle off (about 825 verses) 56,
a quarter off 25, opposite side 0. Raise `K` to make scoring harsher, lower it to make it gentler.

## Deploying to Cloudflare Pages

1. Push this repo to GitHub or GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, and pick the repo.
3. Build settings:
   - **Framework preset:** None (or Vite)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save and deploy. Each push to the main branch redeploys.

The Node version comes from `.nvmrc`. No backend or environment variables are needed.
