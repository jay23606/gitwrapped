# Contributing to gitwrapped

Thanks for helping! Every contribution counts, from a typo fix to a whole new feature.

## Quick start

```bash
git clone https://github.com/<your-username>/gitwrapped.git   # your fork
cd gitwrapped
npm test                      # all tests should pass
node bin/gitwrapped.mjs       # run it on this repo
```

You need Node.js 18+ and `git`. There is nothing to `npm install`, because the project has no dependencies
and we'd like to keep it that way.

## Easy ways to contribute

| Idea | Where |
|---|---|
| Add a personality | `src/personas.mjs` (one object + one test) |
| Add a language | the `LANGUAGES` map in `src/stats.mjs` |
| Ignore another generated file type | the `IGNORED` list in `src/stats.mjs` |
| Improve the terminal output | `src/render/terminal.mjs` |
| Improve the HTML report | `src/render/html.mjs` |
| Pick something from the list | [GOOD_FIRST_ISSUES.md](GOOD_FIRST_ISSUES.md) |

## How the code is organised

`git.mjs` reads commits → `stats.mjs` turns them into one stats object → `render/*` turn that object into
terminal text or HTML. Keeping those three steps separate makes it easy to test and to add new outputs.

- **`stats.mjs` is pure**: no file or network access, so you can unit-test it with fake commits (see `tests/stats.test.mjs`).
- **Tests that need a real repo** use `scripts/fixture.mjs`, which builds a throwaway repository with exact commit dates.
  It never touches your real repos.

## Pull request flow

1. Fork the repo and create a branch (`git checkout -b add-polyglot-persona`).
2. Make one focused change.
3. Add or update a test, then run `npm test`.
4. If you changed anything that affects the report, run `npm run demo` and commit the updated
   `docs/sample.html` and `docs/sample.txt` (CI checks that they are up to date).
5. Open a pull request and fill in the template. Don't worry about perfection; we'll iterate together.

## Ground rules

- **Never use the network.** Privacy is the main promise of this tool. No telemetry, no analytics, no fetching fonts or scripts.
- **Stay read-only.** The tool may run `git log`-style commands, but must never change a repository.
- **Escape everything** you put in HTML. Commit messages and repo names are untrusted input. Use `escapeHtml` from `src/util.mjs`.
- **No new dependencies** without opening an issue first.
- Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Not sure where to start?

Open an issue and say hi. We'll point you at something.
