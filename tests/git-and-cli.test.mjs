import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { cleanPath, findRepos, readCommits } from "../src/git.mjs";
import { main, parseArgs, resolveRange } from "../src/cli.mjs";
import { makeRepo, cleanup } from "../scripts/fixture.mjs";

const NOW = new Date("2026-06-01T12:00:00Z");

function run(argv) {
  let out = "";
  let err = "";
  const code = main(argv, { out: { write: (s) => (out += s) }, err: { write: (s) => (err += s) }, now: NOW });
  return { code, out, err };
}

const history = [
  { date: "2026-03-01T23:30:00Z", msg: "feat: first", files: { "src/a.ts": 10, "package-lock.json": 500 } },
  { date: "2026-03-02T09:00:00Z", msg: "fix: second", files: { "src/a.ts": 4 } },
  { date: "2026-03-02T10:00:00Z", msg: "docs: third", files: { "README.md": 6 }, author: "Grace", email: "grace@example.com" },
];

test("readCommits parses authors, dates and numstat", () => {
  const repo = makeRepo(history, { email: "ada@example.com" });
  try {
    const cs = readCommits(repo);
    assert.equal(cs.length, 3);
    const first = cs.find((c) => c.subject === "feat: first");
    assert.equal(first.date.slice(0, 16), "2026-03-01T23:30");
    assert.deepEqual(first.files.map((f) => f.path).sort(), ["package-lock.json", "src/a.ts"]);
    assert.equal(first.files.find((f) => f.path === "src/a.ts").added, 10);
    const second = cs.find((c) => c.subject === "fix: second");
    assert.equal(second.files[0].deleted, 10); // file shrank from 10 lines to 4 (all replaced)
    assert.equal(readCommits(repo, { author: "grace" }).length, 1);
  } finally {
    cleanup(repo);
  }
});

test("an empty repository gives no commits instead of an error", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gitwrapped-empty-"));
  try {
    spawnSync("git", ["init", "-q", "-b", "main"], { cwd: dir });
    assert.deepEqual(readCommits(dir), []);
    const r = run([dir]);
    assert.equal(r.code, 1);
    assert.match(r.out, /No commits found/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("cleanPath handles rename notation", () => {
  assert.equal(cleanPath("src/{old => new}/x.js"), "src/new/x.js");
  assert.equal(cleanPath("a.js => b.js"), "b.js");
  assert.equal(cleanPath("plain/file.js"), "plain/file.js");
});

test("findRepos finds nested repositories", () => {
  const a = makeRepo([{ date: "2026-03-01T10:00:00Z" }], { name: "one" });
  const root = path.dirname(a);
  const b = makeRepo([{ date: "2026-03-01T10:00:00Z" }], { name: "deep/two", root });
  try {
    const found = findRepos(root).map((p) => path.basename(p)).sort();
    assert.deepEqual(found, ["one", "two"]);
  } finally {
    cleanup(a);
  }
});

test("CLI --json reports the right numbers", () => {
  const repo = makeRepo(history, { email: "ada@example.com" });
  try {
    const r = run([repo, "--json", "--year", "2026"]);
    assert.equal(r.code, 0, r.err);
    const s = JSON.parse(r.out);
    assert.equal(s.totalCommits, 3);
    assert.equal(s.activeDays, 2);
    assert.equal(s.longestStreak.length, 2);
    assert.equal(s.linesAdded, 10 + 4 + 6); // package-lock.json ignored
    assert.equal(s.hours[23], 1);
  } finally {
    cleanup(repo);
  }
});

test("CLI --me only counts your own email", () => {
  const repo = makeRepo(history, { email: "ada@example.com" });
  try {
    const s = JSON.parse(run([repo, "--json", "--me", "--year", "2026"]).out);
    assert.equal(s.totalCommits, 2); // Grace's commit excluded
  } finally {
    cleanup(repo);
  }
});

test("CLI terminal output renders without color codes when piped", () => {
  const repo = makeRepo(history);
  try {
    const r = run([repo, "--year", "2026"]);
    assert.equal(r.code, 0);
    assert.match(r.out, /gitwrapped/);
    assert.match(r.out, /3 commits/);
    assert.ok(!r.out.includes("\x1b["));
  } finally {
    cleanup(repo);
  }
});

test("HTML report is written, self-contained and escapes hostile commit messages", () => {
  const evil = [{ date: "2026-03-01T10:00:00Z", msg: '<img src=x onerror=alert(1)> "quotes" & <script>alert(2)</script>', files: { "a.js": 5 } }];
  const repo = makeRepo(evil, { name: "<b>repo</b>" });
  const file = path.join(path.dirname(repo), "report.html");
  try {
    const r = run([repo, "--year", "2026", "--html", file]);
    assert.equal(r.code, 0, r.err);
    const html = fs.readFileSync(file, "utf8");
    assert.ok(html.startsWith("<!doctype html>"));
    assert.ok(!html.includes("<img src=x"), "unescaped <img> found");
    assert.ok(!html.includes("<script>alert(2)"), "unescaped script found");
    assert.ok(!html.includes("<b>repo</b>"), "unescaped repo name found");
    assert.ok(html.includes("&lt;img src=x"));
    assert.ok(!/(src|href)=["']https?:\/\/(?!github\.com\/luciferalive)/.test(html), "external resource found");
  } finally {
    cleanup(repo);
  }
});

test("--redact hides names in JSON and HTML", () => {
  const repo = makeRepo([{ date: "2026-03-01T10:00:00Z", msg: "launch secret falcon", files: { "stealth/plan.ts": 5 } }], { name: "stealth-startup" });
  const file = path.join(path.dirname(repo), "r.html");
  try {
    const json = run([repo, "--year", "2026", "--redact", "--json", "--html", file]);
    const html = fs.readFileSync(file, "utf8");
    for (const secret of ["stealth-startup", "falcon", "stealth/plan.ts", "Test Dev"]) {
      assert.ok(!json.out.includes(secret), `${secret} leaked in JSON`);
      assert.ok(!html.includes(secret), `${secret} leaked in HTML`);
    }
  } finally {
    cleanup(repo);
  }
});

test("--scan combines several repos", () => {
  const a = makeRepo([{ date: "2026-03-01T10:00:00Z", msg: "a1" }], { name: "alpha" });
  const root = path.dirname(a);
  makeRepo([{ date: "2026-03-02T10:00:00Z", msg: "b1" }, { date: "2026-03-03T10:00:00Z", msg: "b2" }], { name: "beta", root });
  try {
    const s = JSON.parse(run(["--scan", root, "--json", "--year", "2026"]).out);
    assert.equal(s.totalCommits, 3);
    assert.deepEqual(s.repos.map((r) => r.name).sort(), ["alpha", "beta"]);
  } finally {
    cleanup(a);
  }
});

test("bad input gives clear errors and exit code 2", () => {
  assert.equal(run(["/definitely/not/here"]).code, 2);
  assert.match(run(["--wat"]).err, /Unknown option/);
  assert.match(run(["--year", "abc"]).err, /not a year/);
  assert.match(run(["--since", "nonsense"]).err, /not a valid date/);
  assert.match(run(["--since"]).err, /needs a value/);
  assert.equal(run(["--help"]).code, 0);
  assert.match(run(["--version"]).out, /^\d+\.\d+\.\d+/);
});

test("parseArgs and resolveRange", () => {
  const o = parseArgs(["a", "b", "--html", "--me", "--redact"]);
  assert.deepEqual(o.repos, ["a", "b"]);
  assert.equal(o.html, "gitwrapped.html");
  assert.equal(parseArgs(["--html", "out.html"]).html, "out.html");
  assert.deepEqual(resolveRange({ year: "2025" }, NOW), { start: "2025-01-01", end: "2025-12-31" });
  const r = resolveRange({}, NOW);
  assert.equal(r.end, "2026-06-01");
  assert.equal(r.start, "2025-06-02"); // 365 days inclusive
});
