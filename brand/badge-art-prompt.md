I need badge artwork for **Keystone**, a daily Book of Mormon verse-guessing game played on phones by adults and children. Players read a verse and guess its book, chapter, and verse. Badges reward playing every day, improving, and collecting. Please create each badge as a hand-written **SVG file**.

## The look

Classic and reverent but warm and friendly to children: clean line art with simple, bold shapes. No cartoon faces, no gradients-heavy or glossy "game UI" style, and no depictions of Jesus Christ, God, or other sacred figures (use symbols instead, such as a star or an empty tomb).

Use only these colors:

| Name  | Hex       | Use |
| ----- | --------- | --- |
| Navy  | `#162840` | Main lines, icons, numbers |
| Gold  | `#B99854` | Accents, inner borders, tier highlights |
| Paper | `#FBF8F2` | Badge background fill |
| Tan   | `#F5EFE4` | Optional secondary fill |
| Line  | `#E2D7C3` | Optional subtle detail |

The page behind the badges is Tan (`#F5EFE4`), so every badge needs its own Paper fill and a Navy outer edge.

## Technical rules (every file)

- `viewBox="0 0 120 120"`, no `width`/`height` attributes. Keep the artwork inside about 8 to 112 on both axes.
- Plain SVG only: shapes, paths, and text. No `<image>`, no embedded bitmaps, no external fonts or links, no `<script>`, no CSS animations, no filters (blur, drop shadow).
- Text uses `font-family="Times New Roman, Times, serif"`. Keep text to numbers or one short word (at most 8 characters), `font-size` at least 9. Prefer symbols over words.
- It must read clearly at **84 pixels wide**, so use thick-enough lines (stroke width 2 or more for main lines) and avoid fine detail.
- It must still read when shown in **grayscale at 30% opacity**, which is how the game shows badges not yet earned. Make the shape and icon carry the meaning, not color alone.
- Include `role="img"` and an `aria-label` with the badge name on the `<svg>` element.
- Keep each file under 5 KB.
- File names must match the ids below exactly (lowercase, hyphens, `.svg`).

Here is a current placeholder badge, to show the format and the brand's keystone shape:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="7-Day Streak badge">
  <polygon points="16,12 104,12 86,108 34,108" fill="#fbf8f2" stroke="#162840" stroke-width="3" stroke-linejoin="round"/>
  <polygon points="25,20 95,20 80,100 40,100" fill="none" stroke="#b99854" stroke-width="1.5" stroke-linejoin="round"/>
  <text x="60" y="68" text-anchor="middle" font-family="Times New Roman, Times, serif" font-size="48" fill="#162840">7</text>
  <line x1="44" y1="74" x2="76" y2="74" stroke="#b99854" stroke-width="1.5"/>
  <text x="60" y="88" text-anchor="middle" font-family="Times New Roman, Times, serif" font-size="9" letter-spacing="1.5" fill="#162840">DAYS</text>
</svg>
```

Please improve on this placeholder; it is only a starting point.

## Shape for each category

Each category has its own outer shape, so players can tell badge types apart at a glance:

1. **Showing up**: the **keystone** shape (wide at the top, narrow at the bottom, like the placeholder above). This is the brand's logo shape.
2. **Getting better**: a **round medallion**.
3. **Book stamps**: a **rounded-square passport stamp** with a dashed or scalloped inner border, as if stamped in a passport.
4. **Special days**: a **shield**.

## Series and tiers

Badges in a series (for example, games played 5, 10, 25 …) should share one design, with the number changing and the gold growing richer as the tier rises:

- Tiers 1 and 2: a thin gold inner border.
- Tiers 3 and 4: a double gold inner border.
- Tiers 5 and 6: a gold band or gold-filled background behind the number (the number stays Navy or Paper so it stays readable).

## The badges

### 1. Showing up (keystone shape)

| File id | Badge | What it's for | Icon idea |
| --- | --- | --- | --- |
| `first-step` | First Step | Finish your first game | A single footprint or a path's first stone |
| `played-5`, `played-10`, `played-25`, `played-50`, `played-100`, `played-365` | Games Played | Finish 5 / 10 / 25 / 50 / 100 / 365 games | The number, with an open book |
| `streak-3`, `streak-7`, `streak-14`, `streak-30`, `streak-100`, `streak-365` | Iron Rod | Play 3 / 7 / 14 / 30 / 100 / 365 days in a row | The number, with a horizontal iron rod |
| `full-week` | Full Week | Play every day from Sunday to Saturday | Seven small dots or stones in a row |
| `sabbath-keeper` | Sabbath Keeper | Play on 4 Sundays | A simple chapel or a sunrise |
| `welcome-back` | Welcome Back | Come back after missing some days | An open door or a returning path |
| `searcher-of-records` | Searcher of Records | Play a past day's game | A scroll or a stack of plates |
| `missionary-1`, `missionary-5`, `missionary-25` | Missionary | Share your result 1 / 5 / 25 times | The number, with a paper airplane or an outgoing arrow |

### 2. Getting better (round medallion)

| File id | Badge | What it's for | Icon idea |
| --- | --- | --- | --- |
| `right-book` | Right Book | First guess in the correct book | A closed book with a check mark |
| `right-chapter` | Right Chapter | First guess in the correct chapter | An open book with a bookmark |
| `first-exact` | First Exact Verse | First exact verse | A target with a center dot |
| `exact-5`, `exact-25`, `exact-100` | Exact Verses | 5 / 25 / 100 exact verses | The number, with a target |
| `so-close` | So Close | Guess just 1 verse away | Two marks almost touching |
| `title-searcher` | Searcher | Earn the Searcher title (200+ points in a game) | A magnifying glass |
| `title-student` | Student | Earn the Student title (400+) | An open book |
| `title-scholar` | Scholar | Earn the Scholar title (600+) | A quill pen |
| `title-record-keeper` | Record Keeper | Earn the Record Keeper title (800+) | Stacked metal plates |
| `title-keystone` | Keystone | Earn the Keystone title (1,000+) | A keystone at the top of an arch |
| `four-for-four` | Four for Four | Right book on all 4 levels in one game | Four check marks or four stones |
| `perfect-game` | Perfect Game | All 4 verses in the correct chapter | Roman numeral IV with a laurel |
| `mountain-climber` | Mountain Climber | Exact verse on Level 4, the hardest level | A mountain peak with a flag |
| `personal-best` | Personal Best | Beat your best 7-day score | An upward arrow or a rising star |

The five title badges are one series: they should look like tiers (Searcher plainest, Keystone richest gold).

### 3. Book stamps (passport stamp)

One stamp per book of the Book of Mormon. All 15 share one design; only the book name or a short label changes. They will be shown together as a grid, like a passport page.

| File id | Text on stamp |
| --- | --- |
| `book-1-nephi` | 1 NEPHI |
| `book-2-nephi` | 2 NEPHI |
| `book-jacob` | JACOB |
| `book-enos` | ENOS |
| `book-jarom` | JAROM |
| `book-omni` | OMNI |
| `book-words-of-mormon` | W of M |
| `book-mosiah` | MOSIAH |
| `book-alma` | ALMA |
| `book-helaman` | HELAMAN |
| `book-3-nephi` | 3 NEPHI |
| `book-4-nephi` | 4 NEPHI |
| `book-mormon` | MORMON |
| `book-ether` | ETHER |
| `book-moroni` | MORONI |

Collection badges (also passport-stamp shape, but richer, with gold):

| File id | Badge | What it's for | Icon idea |
| --- | --- | --- | --- |
| `all-books` | Every Book | Collect all 15 book stamps | A full passport or 15 small marks |
| `small-plates` | Small Plates | Right book in each of 1 Nephi through Omni | A small stack of plates |
| `tiny-books` | Tiny Books | Right book for Enos, Jarom, Omni, or Words of Mormon | A very small book |
| `famous-alma-32` | Alma 32 | Correctly guess Alma 32 | A seed sprouting |
| `famous-moroni-10` | Moroni 10 | Correctly guess Moroni 10 | A closing book, or a pen setting down |
| `famous-3-nephi-11` | 3 Nephi 11 | Correctly guess 3 Nephi 11 | Light shining down from above (no figure) |

### 4. Special days (shield)

| File id | Badge | What it's for | Icon idea |
| --- | --- | --- | --- |
| `christmas` | Christmas | Play on December 25 | A new star (3 Nephi 1) |
| `easter` | Easter | Play on Easter Sunday | An empty tomb with the stone rolled away |
| `general-conference` | General Conference | Play on a General Conference weekend | A pulpit or a microphone with a book |
| `pioneer` | Pioneer | Played in the game's first month (October 2026) | A covered wagon or a keystone with "2026" |

## How to deliver

There are 61 files, so please work in batches, one category at a time, starting with **Showing up**. For each badge, give one code block labeled with its exact file name, for example:

`first-step.svg`
```svg
<svg ...>...</svg>
```

Before writing each batch, briefly describe the shared design for that category, so the files in it look like one set.
