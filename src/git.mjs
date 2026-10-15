// Reads commit history by running the `git` command. Read-only: never writes to a repo.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RS = "\x1e"; // record separator between commits
const US = "\x1f"; // unit separator between fields

function git(dir, args) {
  return spawnSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 512,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

export function isGitRepo(dir) {
  const r = git(dir, ["rev-parse", "--is-inside-work-tree"]);
  return r.status === 0 && r.stdout.trim() === "true";
}

export function repoRoot(dir) {
  const r = git(dir, ["rev-parse", "--show-toplevel"]);
  return r.status === 0 ? r.stdout.trim() : path.resolve(dir);
}

export function configEmail(dir) {
  const r = git(dir, ["config", "user.email"]);
  return r.status === 0 ? r.stdout.trim() : "";
}

/** Clean up numstat rename notation: "src/{a => b}/x.js" -> "src/b/x.js", "a => b" -> "b". */
export function cleanPath(p) {
  if (!p.includes("=>")) return p;
  const braced = p.replace(/\{([^}]*) => ([^}]*)\}/, "$2").replace(/\/\//g, "/");
  if (braced !== p) return braced;
  return p.split(" => ").pop();
}

/** Parse the raw output of our `git log` call into commit objects. Exported for tests. */
export function parseLog(output, repoName = "") {
  const commits = [];
  for (const chunk of output.split(RS)) {
    if (!chunk.trim()) continue;
    const lines = chunk.split("\n");
    const [sha, name, email, date, subject] = lines[0].split(US);
    if (!sha || !date) continue;
    const files = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const m = line.match(/^(-|\d+)\t(-|\d+)\t(.+)$/);
      if (!m) continue;
      files.push({
        added: m[1] === "-" ? null : Number(m[1]),
        deleted: m[2] === "-" ? null : Number(m[2]),
        path: cleanPath(m[3]),
      });
    }
    commits.push({ sha, name, email, date, subject: subject ?? "", files, repo: repoName });
  }
  return commits;
}

/**
 * Read commits from one repository.
 * `date` is the author's local time in ISO format, so "hour of day" reflects when the person really worked.
 */
export function readCommits(dir, { author, includeMerges = false, repoName } = {}) {
  const name = repoName ?? path.basename(repoRoot(dir));
  const args = [
    "log",
    "--no-color",
    "--date=iso-strict",
    `--pretty=format:${RS}%H${US}%an${US}%ae${US}%aI${US}%s`,
    "--numstat",
  ];
  if (!includeMerges) args.push("--no-merges");
  // Plain-text match (not a regex), so emails like "me+work@example.com" work. git matches it
  // against "Name <email>".
  if (author) args.push("--fixed-strings", "--regexp-ignore-case", `--author=${author}`);
  const r = git(dir, args);
  // An empty repo (no commits yet) exits non-zero. Treat it as "no commits".
  if (r.status !== 0) return [];
  return parseLog(r.stdout, name);
}

/** Find git repositories inside `dir`, up to `depth` folders deep. */
export function findRepos(dir, depth = 2) {
  const found = [];
  const skip = new Set(["node_modules", ".git", ".cache", "dist", "build", "target", "vendor", ".venv", "venv"]);
  function walk(d, level) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.name === ".git")) {
      found.push(d);
      return; // don't look inside a repo for more repos
    }
    if (level >= depth) return;
    for (const e of entries) {
      if (e.isDirectory() && !skip.has(e.name) && !e.name.startsWith(".")) walk(path.join(d, e.name), level + 1);
    }
  }
  walk(path.resolve(dir), 0);
  return found;
}
