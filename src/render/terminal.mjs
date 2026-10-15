// Pretty terminal output: persona, numbers, a GitHub-style heatmap, hour/weekday sparklines and bars.

import { buildGrid } from "../grid.mjs";
import { fmt, hourLabel, plural, prettyDate, WEEKDAYS } from "../util.mjs";

const SPARK = "▁▂▃▄▅▆▇█";
const HEAT_256 = [238, 22, 28, 34, 82]; // dark grey → bright green
const HEAT_PLAIN = ["·", "░", "▒", "▓", "█"];

export function renderTerminal(s, { color = true } = {}) {
  const paint = (code) => (t) => (color ? `\x1b[${code}m${t}\x1b[0m` : String(t));
  const bold = paint("1");
  const dim = paint("2");
  const violet = paint("38;5;99");
  const magenta = paint("38;5;205");
  const gold = paint("38;5;221");
  const green = paint("38;5;77");
  const red = paint("38;5;203");

  const L = [];
  const push = (line = "") => L.push(line);

  push();
  push(`${bold(violet("git"))}${bold(magenta("wrapped"))}  ${dim(rangeLabel(s))}`);
  push();

  if (!s.totalCommits) {
    push("No commits found for this period.");
    push();
    return L.join("\n");
  }

  push(`  ${s.persona.emoji}  ${bold(s.persona.title)}`);
  push(`     ${dim(s.persona.tagline)}`);
  push();

  // ---- headline numbers ----
  push(`  ${bold(gold(fmt(s.totalCommits)))} commits across ${bold(plural(s.activeDays, "active day"))}` +
    (s.repos.length > 1 ? ` in ${bold(plural(s.repos.length, "repo"))}` : ""));
  push(`  ${green("+" + fmt(s.linesAdded))} ${red("-" + fmt(s.linesDeleted))} lines in ${bold(plural(s.filesTouched, "file"))}`);
  push(`  🔥 Longest streak: ${bold(plural(s.longestStreak.length, "day"))}` +
    (s.longestStreak.length > 1 ? dim(` (${prettyDate(s.longestStreak.start)} → ${prettyDate(s.longestStreak.end)})`) : "") +
    (s.currentStreak > 1 ? `   ·   current: ${bold(plural(s.currentStreak, "day"))}` : ""));
  if (s.busiestDay) push(`  📅 Busiest day: ${bold(prettyDate(s.busiestDay.date))} ${dim(`(${plural(s.busiestDay.count, "commit")})`)}`);
  push();

  // ---- heatmap ----
  const grid = buildGrid(s.daily, s.range.start, s.range.end);
  const cell = (c) => {
    if (!c.inRange) return " ";
    const lv = c.count === 0 ? 0 : grid.level(c.count);
    return color ? `\x1b[38;5;${HEAT_256[lv]}m■\x1b[0m` : HEAT_PLAIN[lv];
  };
  const header = Array(grid.weeks.length).fill(" ");
  let nextFree = 0;
  for (const m of grid.monthLabels) {
    if (m.col < nextFree || m.col + 3 > header.length) continue;
    for (let i = 0; i < 3; i++) header[m.col + i] = m.label[i];
    nextFree = m.col + 4;
  }
  push("  " + "    " + dim(header.join("")));
  const dayNames = ["", "Mon", "", "Wed", "", "Fri", ""];
  for (let row = 0; row < 7; row++) {
    push("  " + dim(dayNames[row].padEnd(4)) + grid.weeks.map((w) => cell(w[row])).join(""));
  }
  push("  " + "    " + dim("less ") + HEAT_PLAIN.map((_, i) => (color ? `\x1b[38;5;${HEAT_256[i]}m■\x1b[0m` : HEAT_PLAIN[i])).join(" ") + dim(" more") +
    (grid.clipped ? dim("   (showing the last 53 weeks)") : ""));
  push();

  // ---- when you code ----
  const spark = (arr) => {
    const max = Math.max(...arr);
    return arr.map((v) => (v === 0 ? dim("·") : violet(SPARK[Math.min(7, Math.round((v / max) * 7))]))).join("");
  };
  const axis = Array(24).fill(" ");
  for (const h of [0, 6, 12, 18]) {
    const lab = String(h).padStart(2, "0");
    axis[h] = lab[0];
    axis[h + 1] = lab[1];
  }
  push(`  ${bold("Hours")}   ${spark(s.hours)}   ${dim("peak " + hourLabel(s.peakHour))}`);
  push(`          ${dim(axis.join(""))}`);
  push(`  ${bold("Days")}    ${spark([1, 2, 3, 4, 5, 6, 0].map((d) => s.weekdays[d]))}   ${dim("favourite " + WEEKDAYS[s.favoriteWeekday])}`);
  push(`          ${dim("MTWTFSS")}`);
  push();

  // ---- languages ----
  if (s.languages.length) {
    push(`  ${bold("Top languages")}`);
    for (const l of s.languages.slice(0, 5)) {
      const w = Math.max(1, Math.round(l.share * 24));
      push(`  ${l.name.padEnd(12)} ${magenta("█".repeat(w))}${dim("░".repeat(24 - w))} ${Math.round(l.share * 100)}%`);
    }
    push();
  }

  // ---- words / commit types ----
  if (s.topWords.length) push(`  ${bold("Your words")}  ${s.topWords.slice(0, 8).map((w) => `${w.word} ${dim("×" + w.count)}`).join("  ")}`);
  if (s.commitTypes.length) push(`  ${bold("Commit types")}  ${s.commitTypes.slice(0, 6).map((t) => `${t.type} ${dim("×" + t.count)}`).join("  ")}`);
  if (s.biggestCommit) {
    push(`  ${bold("Biggest commit")}  ${green("+" + fmt(s.biggestCommit.added))} ${red("-" + fmt(s.biggestCommit.deleted))} ${dim(s.biggestCommit.sha)} ${truncate(s.biggestCommit.subject, 48)}`);
  }
  if (s.repos.length > 1) push(`  ${bold("Repos")}  ${s.repos.slice(0, 5).map((r) => `${r.name} ${dim("×" + r.commits)}`).join("  ")}`);
  push();

  for (const f of s.funFacts.slice(0, 3)) push(`  ${gold("✦")} ${f}`);
  if (s.funFacts.length) push();
  push(dim("  Generated locally. Nothing left your machine. Add --html to get a shareable report."));
  push();
  return L.join("\n");
}

function rangeLabel(s) {
  if (!s.range.start) return "";
  return `${prettyDate(s.range.start)} → ${prettyDate(s.range.end)}`;
}

function truncate(t, n) {
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}
