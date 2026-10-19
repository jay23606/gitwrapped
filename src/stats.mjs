// Turns a list of commits into the numbers shown in the report. Pure functions, no I/O.

import { DAY, dayNum, keyFromNum, weekdayOf, WEEKDAYS, hourLabel } from "./util.mjs";
import { pickPersona } from "./personas.mjs";

// Files that would drown out the real story (lockfiles, minified bundles, generated maps).
const IGNORED = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)bun\.lockb?$/,
  /(^|\/)Cargo\.lock$/,
  /(^|\/)poetry\.lock$/,
  /(^|\/)Pipfile\.lock$/,
  /(^|\/)composer\.lock$/,
  /(^|\/)Gemfile\.lock$/,
  /(^|\/)go\.sum$/,
  /\.min\.(js|css)$/,
  /\.map$/,
  /(^|\/)(node_modules|vendor|dist)\//,
];
export const isIgnoredFile = (p) => IGNORED.some((re) => re.test(p));

const LANGUAGES = {
  js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript", jsx: "JavaScript",
  ts: "TypeScript", tsx: "TypeScript",
  py: "Python", rs: "Rust", go: "Go", java: "Java", kt: "Kotlin", swift: "Swift",
  c: "C", h: "C", cpp: "C++", cc: "C++", hpp: "C++", cs: "C#", rb: "Ruby", php: "PHP",
  sh: "Shell", bash: "Shell", zsh: "Shell", ps1: "PowerShell",
  html: "HTML", css: "CSS", scss: "CSS", sass: "CSS", vue: "Vue", svelte: "Svelte",
  md: "Markdown", mdx: "Markdown", json: "JSON", yml: "YAML", yaml: "YAML", toml: "TOML",
  sql: "SQL", dart: "Dart", lua: "Lua", r: "R", scala: "Scala", ex: "Elixir", exs: "Elixir",
  hs: "Haskell", clj: "Clojure", tf: "Terraform", dockerfile: "Docker", ipynb: "Jupyter",
};

const STOPWORDS = new Set(
  "a an and are as at be by for from has have in into is it its of on or that the this to was we with you your i my our not no so if but".split(" "),
);

const CONVENTIONAL = new Set(["feat", "fix", "docs", "chore", "refactor", "test", "tests", "style", "perf", "build", "ci", "revert"]);

function extensionOf(p) {
  const base = p.split("/").pop();
  if (base.toLowerCase() === "dockerfile") return "dockerfile";
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1).toLowerCase() : "";
}

const topN = (map, n, shape) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, n)
    .map(([k, v]) => shape(k, v));

const argmax = (arr) => arr.reduce((best, v, i) => (v > arr[best] ? i : best), 0);

function longestAndCurrentStreak(dayNums, todayNum) {
  if (!dayNums.length) return { longest: { length: 0, start: null, end: null }, current: 0 };
  let best = { length: 1, startN: dayNums[0], endN: dayNums[0] };
  let run = { length: 1, startN: dayNums[0], endN: dayNums[0] };
  for (let i = 1; i < dayNums.length; i++) {
    if (dayNums[i] === dayNums[i - 1] + 1) {
      run = { ...run, length: run.length + 1, endN: dayNums[i] };
    } else {
      run = { length: 1, startN: dayNums[i], endN: dayNums[i] };
    }
    if (run.length > best.length) best = run;
  }
  // "Current" only counts if the last active day is today or yesterday.
  const lastN = dayNums[dayNums.length - 1];
  const current = lastN >= todayNum - 1 ? run.length : 0;
  return {
    longest: { length: best.length, start: keyFromNum(best.startN), end: keyFromNum(best.endN) },
    current,
  };
}

/**
 * @param {Array} commits   from git.mjs (readCommits / parseLog)
 * @param {{now?: Date, start: string, end: string}} opts   start/end are "YYYY-MM-DD" keys
 */
export function computeStats(commits, { now = new Date(), start, end } = {}) {
  const daily = {};
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  const monthly = new Map();
  const files = new Map();
  const touched = new Set();
  const exts = new Map();
  const words = new Map();
  const types = new Map();
  const repos = new Map();
  const authors = new Map();

  let added = 0;
  let deleted = 0;
  let emoji = 0;
  let msgLen = 0;
  let fixes = 0;
  let biggest = null;
  let first = null;
  let last = null;

  for (const c of commits) {
    const key = c.date.slice(0, 10);
    daily[key] = (daily[key] || 0) + 1;
    hours[Number(c.date.slice(11, 13))]++;
    weekdays[weekdayOf(dayNum(key))]++;
    monthly.set(key.slice(0, 7), (monthly.get(key.slice(0, 7)) || 0) + 1);
    repos.set(c.repo, (repos.get(c.repo) || 0) + 1);
    authors.set(c.name, (authors.get(c.name) || 0) + 1);

    if (!first || c.date < first.date) first = c;
    if (!last || c.date > last.date) last = c;

    const subject = c.subject || "";
    msgLen += subject.length;
    emoji += (subject.match(/\p{Extended_Pictographic}/gu) || []).length;
    if (/^fix/i.test(subject)) fixes++;
    const t = subject.match(/^(\w+)(\([^)]*\))?!?:/);
    if (t && CONVENTIONAL.has(t[1].toLowerCase())) {
      const type = t[1].toLowerCase() === "tests" ? "test" : t[1].toLowerCase();
      types.set(type, (types.get(type) || 0) + 1);
    }
    for (const w of subject.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []) {
      if (!STOPWORDS.has(w)) words.set(w, (words.get(w) || 0) + 1);
    }

    let cAdded = 0;
    let cDeleted = 0;
    for (const f of c.files) {
      if (isIgnoredFile(f.path)) continue;
      touched.add(`${c.repo}:${f.path}`);
      files.set(f.path, (files.get(f.path) || 0) + 1);
      const lang = LANGUAGES[extensionOf(f.path)];
      if (lang) exts.set(lang, (exts.get(lang) || 0) + 1);
      cAdded += f.added || 0;
      cDeleted += f.deleted || 0;
    }
    added += cAdded;
    deleted += cDeleted;
    if (!biggest || cAdded + cDeleted > biggest.lines) {
      biggest = { sha: c.sha.slice(0, 7), subject, repo: c.repo, date: key, added: cAdded, deleted: cDeleted, lines: cAdded + cDeleted };
    }
  }

  const total = commits.length;
  const dayKeys = Object.keys(daily).sort();
  const dayNums = dayKeys.map(dayNum);
  const todayNum = Math.floor(now.getTime() / DAY);
  const { longest, current } = longestAndCurrentStreak(dayNums, todayNum);

  const busiestKey = dayKeys.reduce((b, k) => (b === null || daily[k] > daily[b] ? k : b), null);
  const spanDays = start && end ? dayNum(end) - dayNum(start) + 1 : dayKeys.length;
  const share = (n) => (total ? n / total : 0);
  const sum = (arr, from, to) => arr.slice(from, to).reduce((a, b) => a + b, 0);

  const languageTotal = [...exts.values()].reduce((a, b) => a + b, 0);

  const stats = {
    range: { start: start ?? dayKeys[0] ?? null, end: end ?? dayKeys[dayKeys.length - 1] ?? null },
    totalCommits: total,
    activeDays: dayKeys.length,
    spanDays,
    perActiveDay: dayKeys.length ? total / dayKeys.length : 0,
    longestStreak: longest,
    currentStreak: current,
    busiestDay: busiestKey ? { date: busiestKey, count: daily[busiestKey] } : null,
    hours,
    weekdays,
    peakHour: total ? argmax(hours) : null,
    favoriteWeekday: total ? argmax(weekdays) : null,
    monthly: [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([month, count]) => ({ month, count })),
    linesAdded: added,
    linesDeleted: deleted,
    avgLinesPerCommit: total ? (added + deleted) / total : 0,
    filesTouched: touched.size,
    topFiles: topN(files, 5, (path, changes) => ({ path, changes })),
    languages: topN(exts, 8, (name, changes) => ({ name, changes, share: languageTotal ? changes / languageTotal : 0 })),
    topWords: topN(words, 12, (word, count) => ({ word, count })),
    commitTypes: topN(types, 8, (type, count) => ({ type, count })),
    biggestCommit: biggest && biggest.lines > 0 ? biggest : null,
    avgMessageLength: total ? Math.round(msgLen / total) : 0,
    emojiCount: emoji,
    repos: topN(repos, 20, (name, commits) => ({ name, commits })),
    authors: topN(authors, 10, (name, commits) => ({ name, commits })),
    firstCommit: first ? first.date.slice(0, 10) : null,
    lastCommit: last ? last.date.slice(0, 10) : null,
    daily,
    shares: {
      night: share(sum(hours, 0, 5)), // midnight – 4:59 AM
      early: share(sum(hours, 5, 9)), // 5 AM – 8:59 AM
      weekend: share(weekdays[0] + weekdays[6]),
      fix: share(fixes),
    },
    redacted: false,
  };

  stats.persona = pickPersona(stats);
  stats.funFacts = funFacts(stats);
  return stats;
}

function funFacts(s) {
  const out = [];
  if (!s.totalCommits) return out;
  if (s.peakHour !== null) out.push(`Your peak hour is ${hourLabel(s.peakHour)}.`);
  if (s.favoriteWeekday !== null) out.push(`${WEEKDAYS[s.favoriteWeekday]} is your favourite day to commit.`);
  if (s.spanDays > 0) out.push(`You committed on ${Math.round((s.activeDays / s.spanDays) * 100)}% of the days in this period.`);
  if (s.shares.night >= 0.1) out.push(`${Math.round(s.shares.night * 100)}% of your commits happened between midnight and 5 AM.`);
  if (s.emojiCount > 0) out.push(`You used ${s.emojiCount} emoji in commit messages.`);
  if (s.linesDeleted > s.linesAdded && s.linesAdded > 0) out.push("You deleted more lines than you wrote. Less code, fewer bugs.");
  return out;
}

/** Remove everything that could identify people or projects, so a report is safe to share. */
export function redactStats(s) {
  return {
    ...s,
    redacted: true,
    repos: s.repos.map((r, i) => ({ name: `repo-${i + 1}`, commits: r.commits })),
    authors: s.authors.map((a, i) => ({ name: `author-${i + 1}`, commits: a.commits })),
    topFiles: [],
    topWords: [],
    biggestCommit: s.biggestCommit && { ...s.biggestCommit, subject: "(hidden)", repo: "(hidden)" },
  };
}
