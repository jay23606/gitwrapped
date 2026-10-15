// Generates a fictional year of commits, then runs gitwrapped on it to produce:
//   docs/sample.html   a sample report you can open in a browser
//   docs/sample.txt    the same thing as terminal output (pasted into the README)
// Fully deterministic, so re-running gives identical files. Run: npm run demo

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, makeRepo } from "./fixture.mjs";
import { main } from "../src/cli.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Tiny seeded random number generator (mulberry32) so the demo never changes between runs.
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(2026);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const MESSAGES = [
  "feat: add dark mode toggle", "feat(api): add pagination to list endpoints", "feat: ship onboarding flow",
  "fix: handle empty input", "fix(ui): align heatmap labels", "fix: off-by-one in date range", "fix: crash on startup",
  "refactor: split parser into modules", "refactor: simplify config loading", "docs: update README with examples",
  "test: cover edge cases for streaks", "test: add fixtures for empty repos", "chore: bump dependencies",
  "perf: cache git calls", "ci: speed up the pipeline", "✨ polish the report layout", "🚀 release v0.3.0",
  "feat: support multiple repositories", "fix: wrong weekday on Sundays", "docs: add contributing guide",
];
const FILES = [
  ["src/app.ts", 40], ["src/parser.ts", 60], ["src/ui/Report.tsx", 50], ["src/api/routes.ts", 35],
  ["lib/stats.py", 45], ["tests/test_stats.py", 30], ["README.md", 20], ["styles/theme.css", 25],
  ["config/settings.yaml", 8], ["package.json", 6], ["package-lock.json", 800],
];

const commits = [];
const start = Date.UTC(2025, 9, 15); // Oct 15, 2025
const DAYS = 365;
for (let d = 0; d < DAYS; d++) {
  const date = new Date(start + d * 86400000);
  const dow = date.getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const inSprint = d >= 200 && d < 224; // a 24-day streak in the summer
  const active = inSprint || rand() < (weekend ? 0.3 : 0.62);
  if (!active) continue;
  const n = 1 + Math.floor(rand() * (inSprint ? 6 : 4));
  for (let i = 0; i < n; i++) {
    // Mostly evenings and late nights, a few mornings.
    const r = rand();
    const hour = r < 0.12 ? 8 + Math.floor(rand() * 3) : r < 0.55 ? 19 + Math.floor(rand() * 4) : r < 0.75 ? 13 + Math.floor(rand() * 5) : Math.floor(rand() * 4);
    const minute = Math.floor(rand() * 60);
    const stamp = new Date(date.getTime() + (hour * 60 + minute) * 60000);
    const files = {};
    for (let f = 0; f < 1 + Math.floor(rand() * 3); f++) {
      const [file, base] = pick(FILES);
      files[file] = Math.max(3, base + Math.floor(rand() * 30) - 15);
    }
    commits.push({ date: stamp.toISOString(), msg: pick(MESSAGES), files, author: "Alex Rivera", email: "alex@example.com" });
  }
}
commits.sort((a, b) => a.date.localeCompare(b.date));

const repo = makeRepo(commits, { name: "stellar-app", email: "alex@example.com" });
try {
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  const now = new Date("2026-10-14T12:00:00Z");
  const base = [repo, "--since", "2025-10-15", "--until", "2026-10-14"];
  const io = (sink) => ({ out: { write: (s) => sink.push(s) }, err: { write() {} }, now });

  const txt = [];
  main([...base, "--no-color"], io(txt));
  fs.writeFileSync(path.join(root, "docs/sample.txt"), txt.join(""));

  const htmlLog = [];
  main([...base, "--html", path.join(root, "docs/sample.html")], io(htmlLog));
  console.log(`Wrote docs/sample.html and docs/sample.txt (${commits.length} fictional commits)`);
} finally {
  cleanup(repo);
}
