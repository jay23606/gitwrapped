import test from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "../src/stats.mjs";
import { renderHtml } from "../src/render/html.mjs";

test("HTML escapes arbitrary repository names without creating them on disk", () => {
  const repo = '<b>repo</b> "quotes" & \'single\'';
  const commits = [repo, "another-repo"].map((name, i) => ({
    repo: name,
    sha: `${i}abcdef`,
    date: "2026-03-01T10:00:00+00:00",
    author: "Test Dev",
    email: "dev@example.com",
    subject: "feat: example",
    files: [{ path: "file.js", added: i + 1, deleted: 0 }],
  }));
  const stats = computeStats(commits, {
    now: new Date("2026-06-01T12:00:00Z"),
    start: "2026-01-01",
    end: "2026-12-31",
  });
  const html = renderHtml(stats);

  assert.ok(!html.includes(repo), "unescaped repository name found");
  assert.ok(!html.includes("<b>repo</b>"), "repository name became an HTML element");
  assert.ok(html.includes("&lt;b&gt;repo&lt;/b&gt; &quot;quotes&quot; &amp; &#39;single&#39;"));
});
