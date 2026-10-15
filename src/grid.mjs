// Turns per-day commit counts into a GitHub-style calendar grid (weeks x 7 days).

import { dayNum, keyFromNum, weekdayOf, MONTHS } from "./util.mjs";

const MAX_DAYS_SHOWN = 371; // 53 weeks

export function buildGrid(daily, startKey, endKey) {
  const endN = dayNum(endKey);
  const startN = Math.max(dayNum(startKey), endN - (MAX_DAYS_SHOWN - 1));
  const firstSunday = startN - weekdayOf(startN);

  const weeks = [];
  let max = 0;
  for (let w = firstSunday; w <= endN; w += 7) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const n = w + d;
      const inRange = n >= startN && n <= endN;
      const key = keyFromNum(n);
      const count = inRange ? daily[key] || 0 : 0;
      if (count > max) max = count;
      col.push({ key, count, inRange });
    }
    weeks.push(col);
  }

  /** 0 = no commits, 1..4 = increasing activity. */
  const level = (count) => (count === 0 ? 0 : Math.min(4, Math.ceil((4 * count) / max)));

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((col, i) => {
    const first = col.find((c) => c.inRange);
    if (!first) return;
    const m = +first.key.slice(5, 7) - 1;
    if (m !== lastMonth) {
      monthLabels.push({ col: i, label: MONTHS[m] });
      lastMonth = m;
    }
  });

  return { weeks, max, level, monthLabels, clipped: dayNum(startKey) < startN };
}
