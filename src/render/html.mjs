// A single self-contained HTML file: no external requests, so opening or sharing it leaks nothing.

import { buildGrid } from "../grid.mjs";
import { escapeHtml as h, fmt, hourLabel, plural, prettyDate, WEEKDAYS } from "../util.mjs";

const CSS = `
:root{--bg:#0b0b14;--panel:#14142a;--panel2:#1a1a36;--line:#2a2a4a;--text:#ececf6;--muted:#9a9ab8;
  --violet:#7c5cff;--magenta:#ff4fb0;--gold:#f5c76a;--green:#4ade80;--red:#fb7185;
  --l0:#1b1b34;--l1:#2d2a6e;--l2:#4b3bb8;--l3:#7c5cff;--l4:#c9b8ff;
  --grad:linear-gradient(135deg,var(--violet),var(--magenta))}
@media (prefers-color-scheme:light){:root{--bg:#f6f6fb;--panel:#fff;--panel2:#f0effa;--line:#dcdaf0;--text:#1a1830;--muted:#6a6888;
  --gold:#b7791f;--green:#15803d;--red:#be123c;--l0:#e8e8f4;--l1:#cfc6ff;--l2:#a998ff;--l3:#7c5cff;--l4:#4a2fd6}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  background-image:radial-gradient(60rem 28rem at 10% -10%,rgba(124,92,255,.22),transparent 60%),radial-gradient(50rem 26rem at 100% 0,rgba(255,79,176,.15),transparent 60%);
  background-attachment:fixed}
.wrap{max-width:1000px;margin:0 auto;padding:0 20px 50px}
header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:22px 0;flex-wrap:wrap}
.brand{font-weight:800;font-size:20px;letter-spacing:-.02em}
.grad{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.range{color:var(--muted);font-size:14px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:20px;margin-bottom:16px}
.card h2{margin:0 0 12px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.hero{text-align:center;padding:36px 20px;background:linear-gradient(135deg,rgba(124,92,255,.28),rgba(255,79,176,.2));border-color:rgba(255,255,255,.14)}
.hero .e{font-size:64px;line-height:1}
.hero h1{margin:10px 0 4px;font-size:clamp(30px,6vw,48px);letter-spacing:-.03em}
.hero p{margin:0;color:var(--muted);font-size:17px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.stat b{display:block;font-size:28px;letter-spacing:-.02em}
.stat span{font-size:13px;color:var(--muted)}
.add{color:var(--green)}.del{color:var(--red)}
.scroll{overflow-x:auto;padding-bottom:6px}
svg{display:block}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:760px){.cols{grid-template-columns:1fr}}
.row{display:grid;grid-template-columns:96px 1fr 44px;gap:10px;align-items:center;font-size:14px;margin:7px 0}
.track{height:10px;border-radius:99px;background:var(--panel2);overflow:hidden}
.track i{display:block;height:100%;background:var(--grad);border-radius:99px}
.row em{font-style:normal;color:var(--muted);text-align:right}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{background:var(--panel2);border:1px solid var(--line);border-radius:99px;padding:4px 12px;font-size:14px}
.chip small{color:var(--muted)}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px}
.facts{margin:0;padding-left:20px;color:var(--text)}
.facts li{margin:4px 0}
footer{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:13px;padding-top:8px}
button{font:inherit;font-weight:600;color:#fff;background:var(--grad);border:0;border-radius:12px;padding:10px 18px;cursor:pointer}
button:hover{filter:brightness(1.1)}
.legend{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted);margin-top:8px}
`;

function heatmapSvg(s) {
  const grid = buildGrid(s.daily, s.range.start, s.range.end);
  const SIZE = 12;
  const GAP = 3;
  const STEP = SIZE + GAP;
  const left = 30;
  const top = 18;
  const width = left + grid.weeks.length * STEP;
  const height = top + 7 * STEP;
  const out = [`<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Commit calendar heatmap">`];
  for (const m of grid.monthLabels) out.push(`<text x="${left + m.col * STEP}" y="11" fill="var(--muted)" font-size="10">${h(m.label)}</text>`);
  [["Mon", 1], ["Wed", 3], ["Fri", 5]].forEach(([t, row]) =>
    out.push(`<text x="0" y="${top + row * STEP + 10}" fill="var(--muted)" font-size="10">${t}</text>`));
  grid.weeks.forEach((col, i) =>
    col.forEach((c, row) => {
      if (!c.inRange) return;
      const lv = c.count === 0 ? 0 : grid.level(c.count);
      out.push(
        `<rect x="${left + i * STEP}" y="${top + row * STEP}" width="${SIZE}" height="${SIZE}" rx="3" fill="var(--l${lv})"><title>${h(prettyDate(c.key))}: ${plural(c.count, "commit")}</title></rect>`,
      );
    }));
  out.push("</svg>");
  return { svg: out.join(""), clipped: grid.clipped };
}

function hoursSvg(hours) {
  const max = Math.max(...hours, 1);
  const bars = hours
    .map((v, i) => {
      const bh = Math.max(v ? 3 : 0, Math.round((v / max) * 60));
      return `<rect x="${i * 10}" y="${64 - bh}" width="8" height="${bh}" rx="2" fill="var(--violet)"><title>${hourLabel(i)}: ${plural(v, "commit")}</title></rect>`;
    })
    .join("");
  const labels = [[0, "12a"], [6, "6a"], [12, "12p"], [18, "6p"]]
    .map(([i, t]) => `<text x="${i * 10}" y="78" fill="var(--muted)" font-size="8">${t}</text>`)
    .join("");
  return `<svg viewBox="0 0 240 82" width="100%" role="img" aria-label="Commits by hour of day">${bars}${labels}</svg>`;
}

function barRows(items, valueOf, labelOf, shareOf) {
  return items
    .map((it) => `<div class="row"><span>${h(labelOf(it))}</span><div class="track"><i style="width:${Math.max(2, Math.round(shareOf(it) * 100))}%"></i></div><em>${h(valueOf(it))}</em></div>`)
    .join("");
}

export function renderHtml(s) {
  const title = s.redacted ? "My Git Wrapped" : "My Git Wrapped";
  const range = s.range.start ? `${prettyDate(s.range.start)} → ${prettyDate(s.range.end)}` : "";

  if (!s.totalCommits) {
    return page(title, `<div class="card hero"><div class="e">🫥</div><h1>No commits found</h1><p>${h(range)}</p></div>`, "");
  }

  const hm = heatmapSvg(s);
  const maxDay = Math.max(...s.weekdays, 1);
  const weekdayRows = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<div class="row"><span>${WEEKDAYS[d].slice(0, 3)}</span><div class="track"><i style="width:${Math.max(s.weekdays[d] ? 2 : 0, Math.round((s.weekdays[d] / maxDay) * 100))}%"></i></div><em>${fmt(s.weekdays[d])}</em></div>`)
    .join("");

  const shareText = `My Git Wrapped: ${fmt(s.totalCommits)} commits, ${plural(s.activeDays, "active day")}, ${plural(s.longestStreak.length, "day")} longest streak. ${s.persona.emoji} ${s.persona.title}`;

  const body = `
<section class="card hero">
  <div class="e">${s.persona.emoji}</div>
  <h1><span class="grad">${h(s.persona.title)}</span></h1>
  <p>${h(s.persona.tagline)}</p>
</section>

<section class="stats">
  <div class="stat"><b>${fmt(s.totalCommits)}</b><span>commits</span></div>
  <div class="stat"><b>${fmt(s.activeDays)}</b><span>active days</span></div>
  <div class="stat"><b>${fmt(s.longestStreak.length)}</b><span>day longest streak${s.longestStreak.length > 1 ? `<br>${h(prettyDate(s.longestStreak.start))} → ${h(prettyDate(s.longestStreak.end))}` : ""}</span></div>
  <div class="stat"><b>${fmt(s.currentStreak)}</b><span>day current streak</span></div>
  <div class="stat"><b class="add">+${fmt(s.linesAdded)}</b><span>lines added</span></div>
  <div class="stat"><b class="del">−${fmt(s.linesDeleted)}</b><span>lines deleted</span></div>
  <div class="stat"><b>${fmt(s.filesTouched)}</b><span>files touched</span></div>
  ${s.busiestDay ? `<div class="stat"><b>${fmt(s.busiestDay.count)}</b><span>commits on your busiest day<br>${h(prettyDate(s.busiestDay.date))}</span></div>` : ""}
</section>

<section class="card">
  <h2>Your year in commits</h2>
  <div class="scroll">${hm.svg}</div>
  <div class="legend">Less ${[0, 1, 2, 3, 4].map((i) => `<svg width="12" height="12"><rect width="12" height="12" rx="3" fill="var(--l${i})"/></svg>`).join("")} More${hm.clipped ? " &nbsp;·&nbsp; showing the last 53 weeks" : ""}</div>
</section>

<div class="cols">
  <section class="card"><h2>Hours of the day</h2>${hoursSvg(s.hours)}<p class="range">Peak: ${h(hourLabel(s.peakHour))}</p></section>
  <section class="card"><h2>Days of the week</h2>${weekdayRows}</section>
</div>

${s.languages.length ? `<section class="card"><h2>Top languages</h2>${barRows(s.languages.slice(0, 6), (l) => Math.round(l.share * 100) + "%", (l) => l.name, (l) => l.share)}</section>` : ""}

${s.commitTypes.length || s.topWords.length ? `<div class="cols">
  ${s.topWords.length ? `<section class="card"><h2>Words you used most</h2><div class="chips">${s.topWords.slice(0, 12).map((w) => `<span class="chip">${h(w.word)} <small>×${w.count}</small></span>`).join("")}</div></section>` : ""}
  ${s.commitTypes.length ? `<section class="card"><h2>Commit types</h2><div class="chips">${s.commitTypes.map((t) => `<span class="chip">${h(t.type)} <small>×${t.count}</small></span>`).join("")}</div></section>` : ""}
</div>` : ""}

${s.biggestCommit ? `<section class="card"><h2>Biggest commit</h2><p class="mono"><span class="add">+${fmt(s.biggestCommit.added)}</span> <span class="del">−${fmt(s.biggestCommit.deleted)}</span> &nbsp;${h(s.biggestCommit.sha)} &nbsp;${h(s.biggestCommit.subject)}</p><p class="range">${h(s.biggestCommit.repo)} · ${h(prettyDate(s.biggestCommit.date))}</p></section>` : ""}

${s.repos.length > 1 ? `<section class="card"><h2>Repositories</h2><div class="chips">${s.repos.slice(0, 12).map((r) => `<span class="chip">${h(r.name)} <small>×${r.commits}</small></span>`).join("")}</div></section>` : ""}

${s.funFacts.length ? `<section class="card"><h2>Fun facts</h2><ul class="facts">${s.funFacts.map((f) => `<li>${h(f)}</li>`).join("")}</ul></section>` : ""}
`;

  return page(title, body, shareText, range, s.redacted);
}

function page(title, body, shareText, range = "", redacted = false) {
  const safeShare = JSON.stringify(shareText).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(title)}</title>
<meta name="description" content="Generated locally by gitwrapped. Nothing was uploaded.">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header><div class="brand">git<span class="grad">wrapped</span></div><div class="range">${h(range)}${redacted ? " · names hidden" : ""}</div></header>
${body}
<footer>
  <span>Generated locally with <a href="https://github.com/luciferalive/gitwrapped" style="color:inherit">gitwrapped</a>. Nothing was uploaded.</span>
  <button type="button" id="copy">Copy summary</button>
</footer>
</div>
<script>
// On narrow screens, show the most recent weeks first.
document.querySelectorAll(".scroll").forEach(function (el) { el.scrollLeft = el.scrollWidth; });
document.getElementById("copy").addEventListener("click", function () {
  var t = ${safeShare};
  var b = this;
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "Copied!"; }, function () { prompt("Copy this:", t); });
});
</script>
</body>
</html>
`;
}
