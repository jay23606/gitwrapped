import test from "node:test";
import assert from "node:assert/strict";
import { computeStats, redactStats, isIgnoredFile } from "../src/stats.mjs";
import { buildGrid } from "../src/grid.mjs";
import { pickPersona } from "../src/personas.mjs";

// Build a fake commit object (same shape git.mjs produces).
let n = 0;
const commit = (date, subject = "work", files = [], extra = {}) => ({
  sha: String(++n).padStart(40, "a"),
  name: "Ada",
  email: "ada@example.com",
  date,
  subject,
  files,
  repo: "demo",
  ...extra,
});
const range = { start: "2026-01-01", end: "2026-12-31" };
const NOW = new Date("2026-03-07T12:00:00Z");

test("streaks: longest run and current run", () => {
  const cs = ["2026-03-01", "2026-03-02", "2026-03-03", "2026-03-05", "2026-03-06"].map((d) => commit(`${d}T10:00:00+00:00`));
  const s = computeStats(cs, { ...range, now: NOW });
  assert.equal(s.longestStreak.length, 3);
  assert.equal(s.longestStreak.start, "2026-03-01");
  assert.equal(s.longestStreak.end, "2026-03-03");
  assert.equal(s.currentStreak, 2); // Mar 5-6, and today is Mar 7
  const later = computeStats(cs, { ...range, now: new Date("2026-03-20T00:00:00Z") });
  assert.equal(later.currentStreak, 0);
  assert.equal(s.activeDays, 5);
});

test("hours and weekdays use the author's local time", () => {
  const s = computeStats([commit("2026-03-01T23:30:00+00:00")], { ...range, now: NOW });
  assert.equal(s.hours[23], 1);
  assert.equal(s.weekdays[0], 1); // 2026-03-01 is a Sunday
  assert.equal(s.peakHour, 23);
});

test("lockfiles and minified files are ignored in line counts", () => {
  const files = [
    { path: "package-lock.json", added: 50000, deleted: 10 },
    { path: "dist/app.min.js", added: 9999, deleted: 0 },
    { path: "src/index.ts", added: 12, deleted: 3 },
  ];
  const s = computeStats([commit("2026-03-01T10:00:00+00:00", "x", files)], { ...range, now: NOW });
  assert.equal(s.linesAdded, 12);
  assert.equal(s.linesDeleted, 3);
  assert.equal(s.filesTouched, 1);
  assert.ok(isIgnoredFile("a/b/yarn.lock"));
  assert.ok(!isIgnoredFile("src/lock.ts"));
});

test("languages come from file extensions; binary files do not crash", () => {
  const files = [
    { path: "a.ts", added: 1, deleted: 0 },
    { path: "b.tsx", added: 1, deleted: 0 },
    { path: "c.py", added: 1, deleted: 0 },
    { path: "logo.png", added: null, deleted: null },
  ];
  const s = computeStats([commit("2026-03-01T10:00:00+00:00", "x", files)], { ...range, now: NOW });
  assert.equal(s.languages[0].name, "TypeScript");
  assert.equal(s.languages[0].changes, 2);
  assert.equal(s.linesAdded, 3);
});

test("words skip stopwords; conventional commit types are counted", () => {
  const cs = ["feat(ui): add the dark theme", "fix: the crash", "fix!: another crash", "chore: bump"].map((m) => commit("2026-03-01T10:00:00+00:00", m));
  const s = computeStats(cs, { ...range, now: NOW });
  assert.ok(!s.topWords.some((w) => w.word === "the"));
  assert.equal(s.topWords[0].word, "crash");
  assert.deepEqual(s.commitTypes.map((t) => t.type), ["fix", "chore", "feat"]);
  assert.equal(s.commitTypes[0].count, 2);
});

test("emoji in messages are counted", () => {
  const s = computeStats([commit("2026-03-01T10:00:00+00:00", "✨ shiny 🚀🚀")], { ...range, now: NOW });
  assert.equal(s.emojiCount, 3);
});

test("biggest commit", () => {
  const cs = [
    commit("2026-03-01T10:00:00+00:00", "small", [{ path: "a.js", added: 1, deleted: 1 }]),
    commit("2026-03-02T10:00:00+00:00", "huge", [{ path: "b.js", added: 500, deleted: 20 }]),
  ];
  const s = computeStats(cs, { ...range, now: NOW });
  assert.equal(s.biggestCommit.subject, "huge");
  assert.equal(s.biggestCommit.lines, 520);
});

test("empty input does not crash", () => {
  const s = computeStats([], { ...range, now: NOW });
  assert.equal(s.totalCommits, 0);
  assert.equal(s.longestStreak.length, 0);
  assert.equal(s.busiestDay, null);
  assert.equal(s.peakHour, null);
});

test("personas", () => {
  const night = Array.from({ length: 10 }, (_, i) => commit(`2026-03-${String(i + 1).padStart(2, "0")}T02:00:00+00:00`));
  assert.equal(computeStats(night, { ...range, now: NOW }).persona.id, "night-owl");

  assert.equal(computeStats([commit("2026-03-02T10:00:00+00:00")], { ...range, now: NOW }).persona.id, "newcomer");

  // 10 commits on weekend days at midday
  const weekend = ["2026-03-01", "2026-03-07", "2026-03-08", "2026-03-14", "2026-03-15", "2026-03-21", "2026-03-22", "2026-03-28", "2026-03-29", "2026-02-28"]
    .map((d) => commit(`${d}T13:00:00+00:00`));
  assert.equal(computeStats(weekend, { ...range, now: NOW }).persona.id, "weekend-warrior");

  const streak = Array.from({ length: 20 }, (_, i) => commit(`2026-03-${String(i + 2).padStart(2, "0")}T10:00:00+00:00`)); // Mon Mar 2 … Sun Mar 21
  // include some weekdays only share < 40% weekend so streak wins
  assert.equal(computeStats(streak, { ...range, now: new Date("2026-03-22T00:00:00Z") }).persona.id, "streak-machine");

  assert.equal(pickPersona({ totalCommits: 50, shares: { night: 0, early: 0, weekend: 0, fix: 0 }, longestStreak: { length: 1 }, linesAdded: 10, linesDeleted: 0, perActiveDay: 1 }).id, "steady-builder");
});

test("the minimalist: tiny commits get it, huge commits do not", () => {
  // 20 one-line commits, every other day, so no streak, weekend or commit-machine rule matches first
  const day = (i) => new Date(Date.UTC(2026, 0, 5) + i * 2 * 86400000).toISOString().slice(0, 10);
  const tiny = Array.from({ length: 20 }, (_, i) => commit(`${day(i)}T10:00:00+00:00`, "tweak", [{ path: "src/a.mjs", added: 1, deleted: 0 }]));
  const tinyStats = computeStats(tiny, { ...range, now: NOW });
  assert.equal(tinyStats.avgLinesPerCommit, 1);
  assert.equal(tinyStats.persona.id, "minimalist");

  const huge = Array.from({ length: 20 }, (_, i) => commit(`${day(i)}T10:00:00+00:00`, "big", [{ path: "src/a.mjs", added: 300, deleted: 20 }]));
  const hugeStats = computeStats(huge, { ...range, now: NOW });
  assert.equal(hugeStats.avgLinesPerCommit, 320);
  assert.notEqual(hugeStats.persona.id, "minimalist");

  assert.equal(computeStats([], { ...range, now: NOW }).avgLinesPerCommit, 0);
});

test("redaction removes names, files, words and commit messages", () => {
  const files = [{ path: "secret/plan.ts", added: 5, deleted: 0 }];
  const s = redactStats(computeStats([commit("2026-03-01T10:00:00+00:00", "launch project falcon", files, { repo: "stealth-startup" })], { ...range, now: NOW }));
  const text = JSON.stringify(s);
  for (const secret of ["stealth-startup", "falcon", "secret/plan.ts", "Ada"]) assert.ok(!text.includes(secret), `${secret} leaked`);
  assert.equal(s.redacted, true);
  assert.equal(s.repos[0].name, "repo-1");
});

test("grid: shape, levels and clipping to 53 weeks", () => {
  const g = buildGrid({ "2026-03-02": 10, "2026-03-03": 1 }, "2026-03-01", "2026-03-31");
  assert.ok(g.weeks.every((w) => w.length === 7));
  assert.equal(g.max, 10);
  assert.equal(g.level(0), 0);
  assert.equal(g.level(10), 4);
  assert.equal(g.level(1), 1);
  assert.equal(g.clipped, false);
  const long = buildGrid({}, "2020-01-01", "2026-03-31");
  assert.equal(long.clipped, true);
  assert.ok(long.weeks.length <= 54);
});
