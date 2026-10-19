// The "coder personality". The first rule that matches wins, so order = priority.
// Want to add one? Add an object to PERSONAS. See CONTRIBUTING.md.
//
// `s` is the stats object built in stats.mjs. Useful fields:
//   totalCommits, activeDays, longestStreak.length, linesAdded, linesDeleted, avgLinesPerCommit,
//   shares.night / shares.early / shares.weekend (0..1), shares.fix (0..1), perActiveDay

export const PERSONAS = [
  {
    id: "newcomer",
    emoji: "🌱",
    title: "The Fresh Start",
    tagline: "Every legend has a first commit. Keep going!",
    match: (s) => s.totalCommits < 5,
  },
  {
    id: "night-owl",
    emoji: "🦉",
    title: "The Night Owl",
    tagline: "The best bugs are fixed after midnight.",
    match: (s) => s.shares.night >= 0.25,
  },
  {
    id: "early-bird",
    emoji: "🌅",
    title: "The Early Bird",
    tagline: "You ship before most people have had coffee.",
    match: (s) => s.shares.early >= 0.3,
  },
  {
    id: "weekend-warrior",
    emoji: "🏴‍☠️",
    title: "The Weekend Warrior",
    tagline: "Saturdays and Sundays are for side projects.",
    match: (s) => s.shares.weekend >= 0.4,
  },
  {
    id: "streak-machine",
    emoji: "🔥",
    title: "The Streak Machine",
    tagline: "You don't skip days. The graph stays green.",
    match: (s) => s.longestStreak.length >= 14,
  },
  {
    id: "refactorer",
    emoji: "♻️",
    title: "The Great Refactorer",
    tagline: "You delete code almost as fast as you write it.",
    match: (s) => s.linesAdded + s.linesDeleted > 200 && s.linesDeleted > s.linesAdded * 0.8,
  },
  {
    id: "firefighter",
    emoji: "🚒",
    title: "The Firefighter",
    tagline: "Something is always on fire, and you always show up.",
    match: (s) => s.shares.fix >= 0.3,
  },
  {
    id: "commit-machine",
    emoji: "⚙️",
    title: "The Commit Machine",
    tagline: "Small commits, constantly. Your history reads like a diary.",
    match: (s) => s.perActiveDay >= 5,
  },
  {
    id: "minimalist",
    emoji: "🔬",
    title: "The Minimalist",
    tagline: "Tiny, surgical commits. One change, one commit.",
    match: (s) => s.totalCommits >= 20 && s.avgLinesPerCommit <= 10,
  },
  {
    id: "steady-builder",
    emoji: "🧱",
    title: "The Steady Builder",
    tagline: "Brick by brick. Consistency beats intensity.",
    match: () => true,
  },
];

export function pickPersona(stats) {
  const p = PERSONAS.find((x) => x.match(stats));
  return { id: p.id, emoji: p.emoji, title: p.title, tagline: p.tagline };
}
