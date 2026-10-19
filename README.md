<div align="center">

# git<span>wrapped</span>

### Spotify Wrapped, but for your git history.

One command. Your streaks, your night-owl score, a year-long heatmap and a coder personality.
**Zero dependencies. Works offline. Nothing is ever uploaded.**

[![Node 18+](https://img.shields.io/badge/node-18%2B-7c5cff?style=for-the-badge)](https://nodejs.org)
[![Zero dependencies](https://img.shields.io/badge/dependencies-0-4ade80?style=for-the-badge)](package.json)
[![License: MIT](https://img.shields.io/badge/license-MIT-ff4fb0?style=for-the-badge)](LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-f5c76a?style=for-the-badge)](CONTRIBUTING.md)

<img src="docs/preview.png" alt="A gitwrapped report: The Night Owl, with stats and a year-long commit heatmap" width="760">

[Quick start](#quick-start) · [Options](#options) · [Privacy](#privacy) · [Personalities](#the-personalities) · [Contribute](#contributing) · [Sample report](https://htmlpreview.github.io/?https://github.com/luciferalive/gitwrapped/blob/main/docs/sample.html)

</div>

---

## Quick start

You only need [Node.js](https://nodejs.org) 18+ and `git`. Run it inside any repository:

```bash
npx github:luciferalive/gitwrapped
```

Or install it once and use it anywhere:

```bash
npm install -g github:luciferalive/gitwrapped
gitwrapped
```

Or run it straight from a clone, with nothing to install:

```bash
git clone https://github.com/luciferalive/gitwrapped.git
node gitwrapped/bin/gitwrapped.mjs /path/to/your/repo
```

### Make a shareable report

```bash
gitwrapped --me --html          # your commits only, saved as gitwrapped.html
gitwrapped --me --html --redact # same, but safe to post publicly (see Privacy)
```

Open `gitwrapped.html` in any browser. It's a single file, works in light and dark mode, and has a
**Copy summary** button for posting.

## What it looks like

```text
gitwrapped  Oct 15, 2025 → Oct 14, 2026

  🦉  The Night Owl
     The best bugs are fixed after midnight.

  577 commits across 223 active days
  +30,556 -30,190 lines in 10 files
  🔥 Longest streak: 27 days (May 3, 2026 → May 29, 2026)
  📅 Busiest day: May 14, 2026 (6 commits)

      Oct     Dec Jan Feb Mar  Apr May  Jun Jul Aug  Sep   
       ▒▒▒░·▒···▓▒········▒▒···▒▒··▒▒██▒···▒·▓·▒░·▒········
  Mon  ·░▒·▒▒░·▒▓░░·▒▓▒▒░░··▒··░▒▒▒▓▒█░▒·▒▒░░▓·▒▓▓▒▒·▓▒▓·▒·
       ▒··▒▒·░▒▒░▓▓▓·▒░▓▓▒▒▒▒░░▒·▒▓▓▒░█░·▒·▒▓▓░░▒░▓▒░·░·▒░·
  Wed ▒░·░▓░▒▒▓·░▓··▓░·▒▒▒·▓▓▒·▓··░▒░█▓▓▒▒··▒·▓·▒▒▒··░▒▒▒··
      ▓·▒▒·▒·▒▒▓▓▓░·▓·▒▓··▒▒·▓·▒▒▓▒▒█░▒···▒▒▒▒▒▒░▒·▒░░··▒· 
  Fri ▓··▒▒▓·░···░░··▓▒▓▒▒░▓··▓▓·▒·▒░▒▒▒▓▓▓····░░·▒▒·▒▒▒·· 
      ···░···░·······▒▒······▒·▒░··▓▒▒··▒░··▓·▓·▒·░····▒·· 
      less · ░ ▒ ▓ █ more

  Hours   ▄▅▄▅····▃▄▄··▃▃▃▃▃·▆▆▆█·   peak 10 PM
          00    06    12    18    
  Days    ██▇▇▇▄▅   favourite Tuesday
          MTWTFSS
```

*(That's a fictional developer. Yours will have your name on it.)*

## Options

| Option | What it does |
|---|---|
| `gitwrapped [repo ...]` | Analyze one or more repos (default: the current folder) |
| `--scan DIR` | Find every git repo inside `DIR` (2 levels deep) and combine them, e.g. `--scan ~/code` |
| `--me` | Only count commits made with **your** git email |
| `--author TEXT` | Only count commits whose author name or email contains `TEXT` |
| `--year 2026` | A calendar year (default: the last 365 days) |
| `--since DATE` / `--until DATE` | A custom range, e.g. `--since 2026-01-01` |
| `--html [FILE]` | Write the shareable HTML report (default: `gitwrapped.html`) |
| `--json` | Print all the stats as JSON, for scripts and dashboards |
| `--redact` | Hide repo names, author names, file names, words and commit messages |
| `--include-merges` | Also count merge commits (off by default) |
| `--no-color` | Plain text output |

Examples:

```bash
gitwrapped --scan ~/code --me --year 2026 --html   # your whole year across every project
gitwrapped --json | jq '.longestStreak'            # pull out one number
```

## Privacy

This tool was built to be safe to run on private code.

- **It never uses the network.** No telemetry, no uploads, no accounts.
- **It only reads.** It runs `git log` and never changes your repo.
- **The HTML report is one file with no external requests.** No fonts, scripts or images are loaded from anywhere.
- **`--redact` makes a report safe to share.** It replaces repo and author names with `repo-1`, `author-1`,
  hides file names, the words you used and the biggest commit's message, so nothing about the project leaks.
- Commit messages are HTML-escaped, so a hostile commit message can't inject anything into the report (this is tested).

## The personalities

Your personality is the first rule below that matches your history.

| | Personality | You get it when… |
|---|---|---|
| 🌱 | **The Fresh Start** | Fewer than 5 commits |
| 🦉 | **The Night Owl** | 25%+ of commits are between midnight and 5 AM |
| 🌅 | **The Early Bird** | 30%+ of commits are between 5 AM and 9 AM |
| 🏴‍☠️ | **The Weekend Warrior** | 40%+ of commits are on Saturday or Sunday |
| 🔥 | **The Streak Machine** | A streak of 14+ days in a row |
| ♻️ | **The Great Refactorer** | You delete almost as much as you add |
| 🚒 | **The Firefighter** | 30%+ of commit messages start with "fix" |
| ⚙️ | **The Commit Machine** | 5+ commits on a typical active day |
| 🔬 | **The Minimalist** | 20+ commits averaging 10 changed lines or fewer each |
| 🧱 | **The Steady Builder** | Everything else |

Got a better idea? Adding one takes about 8 lines. See [Contributing](#contributing).

## How the numbers work

- **Time of day** uses the author's *local* time stored in the commit, so "midnight" really means your midnight.
- **Streaks** count consecutive calendar days with at least one commit. The *current* streak only counts if your last
  commit was today or yesterday.
- **Lines and files** ignore lockfiles (`package-lock.json`, `yarn.lock`, `Cargo.lock`, …), minified files, source maps and
  `node_modules`/`dist`/`vendor`, so one big `npm install` doesn't become your "biggest commit".
- **Languages** are guessed from file extensions.
- **Merge commits** are skipped by default so they don't inflate your numbers.

## Contributing

Contributions of every size are welcome, and the code is small and friendly: under 1,000 lines with **no dependencies**.

```bash
git clone https://github.com/<your-username>/gitwrapped.git
cd gitwrapped
npm test                     # 23 tests, takes about a second
node bin/gitwrapped.mjs      # try it on this repo
```

The easiest first contribution is a **new personality**. Open [`src/personas.mjs`](src/personas.mjs) and add:

```js
{
  id: "polyglot",
  emoji: "🗣️",
  title: "The Polyglot",
  tagline: "Five languages before breakfast.",
  match: (s) => s.languages.length >= 5,   // `s` is the stats object
},
```

Put it above `steady-builder`, add a test, and open a pull request. More ideas are in
[GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md). Read [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

### Project layout

```text
bin/gitwrapped.mjs     the command
src/git.mjs            reads history by running `git log` (read-only)
src/stats.mjs          turns commits into numbers (pure functions, easy to test)
src/personas.mjs       the personality rules
src/grid.mjs           the calendar heatmap layout
src/render/terminal.mjs  terminal output
src/render/html.mjs      the shareable HTML report
scripts/fixture.mjs    builds fake repos with exact dates, for tests and the demo
scripts/make-demo.mjs  regenerates docs/sample.html and docs/sample.txt
tests/                 node:test suites
```

## License

[MIT](LICENSE). Use it, fork it, ship it.
