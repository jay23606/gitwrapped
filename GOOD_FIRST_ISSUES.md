# Good first issues

Copy any of these into GitHub Issues with the labels `good first issue` and `help wanted`,
or just grab one and open a pull request.

## New personalities (about 8 lines + a test each)
- [ ] 🗣️ **The Polyglot**: 5 or more languages in the period
- [ ] 📚 **The Documentarian**: lots of `docs:` commits and Markdown changes
- [ ] 🧪 **The Test Champion**: a high share of `test:` commits
- [ ] 💥 **The Big Banger**: a few huge commits instead of many small ones
- [ ] 🔬 **The Minimalist**: tiny, surgical commits (small average lines per commit)
- [ ] 🎉 **The Emoji Enthusiast**: lots of emoji in commit messages

## New features
- [ ] `--open` to open the HTML report in the default browser when it's written
- [ ] `--format markdown` output for pasting into a README or issue
- [ ] `--svg` to write a single share card image (no dependencies, hand-written SVG)
- [ ] `--ignore GLOB` to exclude extra files from the line counts
- [ ] `--compare 2025 2026` to show a year against the previous year
- [ ] `--utc` to use UTC instead of each author's local time
- [ ] Team mode: a per-author leaderboard section in the HTML report
- [ ] A "most active month" bar chart in the HTML report (the data is already in `stats.monthly`)

## Quality and platforms
- [ ] Run the tests on Windows in CI and fix anything that breaks
- [ ] Add more languages to the extension map in `src/stats.mjs`
- [ ] Translate the personality titles and taglines (i18n)
- [ ] Add a tiny benchmark for a repo with 100k+ commits

## Project
- [ ] Publish to npm so `npx gitwrapped` works
- [ ] A GitHub Action that publishes everyone's yearly wrapped on January 1st
- [ ] Record a short terminal GIF for the README
