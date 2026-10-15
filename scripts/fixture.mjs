// Builds a throwaway git repository with exact dates, using `git fast-import` (fast and deterministic).
// Used by the tests and by scripts/make-demo.mjs. It never touches a real repository.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * @param {Array<{date: string, msg?: string, files?: Record<string, number>, rm?: string[], author?: string, email?: string}>} commits
 *        `date` is an ISO string in UTC, e.g. "2026-03-01T23:30:00Z". `files` maps a path to how many lines it should contain.
 *        Commits must be listed oldest first.
 * @returns {string} path of the new repository
 */
export function makeRepo(commits, { name = "demo-repo", root, email = "dev@example.com" } = {}) {
  const base = root ?? fs.mkdtempSync(path.join(os.tmpdir(), "gitwrapped-"));
  const repo = path.join(base, name);
  fs.mkdirSync(repo, { recursive: true });
  const run = (args, input) => {
    const r = spawnSync("git", args, { cwd: repo, input, encoding: "utf8", maxBuffer: 1 << 28 });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr}`);
  };
  run(["init", "-q", "-b", "main"]);
  run(["config", "user.email", email]);
  run(["config", "user.name", "Test Dev"]);

  const parts = [];
  const data = (s) => {
    parts.push(`data ${Buffer.byteLength(s)}\n${s}\n`);
  };
  commits.forEach((c, i) => {
    const when = Math.floor(new Date(c.date).getTime() / 1000);
    const who = `${c.author ?? "Test Dev"} <${c.email ?? email}> ${when} +0000`;
    parts.push(`commit refs/heads/main\nmark :${i + 1}\nauthor ${who}\ncommitter ${who}\n`);
    data(c.msg ?? `commit ${i + 1}`);
    if (i > 0) parts.push(`from :${i}\n`);
    for (const [file, lines] of Object.entries(c.files ?? { "file.txt": 3 })) {
      parts.push(`M 100644 inline ${file}\n`);
      data(Array.from({ length: lines }, (_, n) => `line ${n} rev ${i}`).join("\n") + "\n");
    }
    for (const file of c.rm ?? []) parts.push(`D ${file}\n`);
    parts.push("\n");
  });
  run(["fast-import", "--quiet"], parts.join(""));
  return repo;
}

export function cleanup(repo) {
  fs.rmSync(path.dirname(repo), { recursive: true, force: true });
}
