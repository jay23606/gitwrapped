// Command line interface.

import fs from "node:fs";
import path from "node:path";
import { configEmail, findRepos, isGitRepo, readCommits, repoRoot } from "./git.mjs";
import { computeStats, redactStats } from "./stats.mjs";
import { renderTerminal } from "./render/terminal.mjs";
import { renderHtml } from "./render/html.mjs";
import { DAY, keyFromNum } from "./util.mjs";

const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const HELP = `
gitwrapped — Spotify Wrapped for your git history

Usage
  gitwrapped [repo ...] [options]

  With no repo given, it uses the current folder.

Options
  --scan DIR        find every git repo inside DIR (up to 2 levels deep) and combine them
  --year YYYY       use that calendar year (default: the last 365 days)
  --since DATE      start date, e.g. 2026-01-01
  --until DATE      end date
  --me              only count commits made with your git email (git config user.email)
  --author TEXT     only count commits whose author name or email contains TEXT
  --include-merges  also count merge commits (off by default)
  --html [FILE]     write a shareable HTML report (default file: gitwrapped.html)
  --json            print the stats as JSON
  --redact          hide repo names, author names, file names, words and commit messages
  --no-color        turn off colors
  -h, --help        show this help
  -v, --version     show the version

Examples
  gitwrapped                         # this repo, last 365 days
  gitwrapped --me --year 2026        # just your commits in 2026
  gitwrapped --scan ~/code --html    # every repo under ~/code, plus an HTML report
  gitwrapped --me --html --redact    # a report that is safe to post publicly

Everything runs locally. Nothing is uploaded.
`;

class UsageError extends Error {}

export function parseArgs(argv) {
  const o = { repos: [], html: null, json: false, redact: false, color: true, me: false, merges: false };
  const needValue = (flag, i) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new UsageError(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h": case "--help": o.help = true; break;
      case "-v": case "--version": o.version = true; break;
      case "--json": o.json = true; break;
      case "--redact": o.redact = true; break;
      case "--no-color": o.color = false; break;
      case "--me": o.me = true; break;
      case "--include-merges": o.merges = true; break;
      case "--scan": o.scan = needValue(a, i); i++; break;
      case "--year": o.year = needValue(a, i); i++; break;
      case "--since": o.since = needValue(a, i); i++; break;
      case "--until": o.until = needValue(a, i); i++; break;
      case "--author": o.author = needValue(a, i); i++; break;
      case "--html": {
        const next = argv[i + 1];
        if (next && /\.html?$/i.test(next)) { o.html = next; i++; } else o.html = "gitwrapped.html";
        break;
      }
      default:
        if (a.startsWith("-")) throw new UsageError(`Unknown option: ${a}  (try --help)`);
        o.repos.push(a);
    }
  }
  return o;
}

function toKey(value, flag) {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + "T00:00:00Z" : value);
  if (Number.isNaN(d.getTime())) throw new UsageError(`${flag}: "${value}" is not a valid date (try 2026-01-31)`);
  return d.toISOString().slice(0, 10);
}

/** Decide the date range as "YYYY-MM-DD" keys. */
export function resolveRange(o, now = new Date()) {
  const todayKey = now.toISOString().slice(0, 10);
  if (o.year) {
    if (!/^\d{4}$/.test(o.year)) throw new UsageError(`--year: "${o.year}" is not a year like 2026`);
    return { start: `${o.year}-01-01`, end: `${o.year}-12-31` };
  }
  const end = o.until ? toKey(o.until, "--until") : todayKey;
  const start = o.since ? toKey(o.since, "--since") : keyFromNum(Math.floor(new Date(end + "T00:00:00Z").getTime() / DAY) - 364);
  if (start > end) throw new UsageError("--since must be before --until");
  return { start, end };
}

export function main(argv, { out = process.stdout, err = process.stderr, now = new Date() } = {}) {
  let o;
  try {
    o = parseArgs(argv);
    if (o.help) { out.write(HELP); return 0; }
    if (o.version) { out.write(pkg.version + "\n"); return 0; }

    // 0) check the date range first, so typos are reported before anything else
    const range = resolveRange(o, now);

    // 1) which repos?
    let roots = [];
    if (o.scan) {
      if (!fs.existsSync(o.scan) || !fs.statSync(o.scan).isDirectory()) throw new UsageError(`--scan: ${o.scan} is not a folder`);
      roots = findRepos(o.scan);
      if (!roots.length) throw new UsageError(`No git repositories found inside ${o.scan}`);
    }
    for (const r of o.repos.length || o.scan ? o.repos : ["."]) {
      if (!fs.existsSync(r) || !isGitRepo(r)) throw new UsageError(`${r} is not a git repository`);
      roots.push(repoRoot(r));
    }
    roots = [...new Set(roots.map((r) => path.resolve(r)))];

    // 2) which commits?
    let author = o.author;
    if (o.me) {
      const email = configEmail(roots[0]);
      if (!email) throw new UsageError("--me needs `git config user.email` to be set");
      author = `<${email}>`;
    }
    let commits = [];
    for (const r of roots) commits = commits.concat(readCommits(r, { author, includeMerges: o.merges }));
    commits = commits.filter((c) => c.date.slice(0, 10) >= range.start && c.date.slice(0, 10) <= range.end);

    // 3) stats + output
    let stats = computeStats(commits, { now, start: range.start, end: range.end });
    if (o.redact) stats = redactStats(stats);

    if (o.html) {
      fs.writeFileSync(o.html, renderHtml(stats));
      err.write(`Wrote ${o.html}${o.redact ? " (names hidden)" : ""}\n`);
    }
    if (o.json) out.write(JSON.stringify(stats, null, 2) + "\n");
    else out.write(renderTerminal(stats, { color: o.color && Boolean(out.isTTY) && !process.env.NO_COLOR }) + "\n");
    return stats.totalCommits ? 0 : 1;
  } catch (e) {
    if (e instanceof UsageError) {
      err.write(`error: ${e.message}\n`);
      return 2;
    }
    err.write((e && e.stack) || String(e));
    err.write("\n");
    return 1;
  }
}
