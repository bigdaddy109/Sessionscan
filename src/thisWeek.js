/** Rockstar GTA Online week: Thursday through next Wednesday (Taipei). */

const TAIPEI_MS = 8 * 60 * 60 * 1000;
export const THIS_WEEK_MAX = 2;

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function taipeiParts(now) {
  const t = new Date((now instanceof Date ? now : new Date(now)).getTime() + TAIPEI_MS);
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth(),
    d: t.getUTCDate(),
    dow: t.getUTCDay(),
  };
}

function ymd(y, m, d) {
  return new Date(Date.UTC(y, m, d));
}

export function rockstarWeekStart(now) {
  const p = taipeiParts(now);
  const sinceThu = (p.dow + 7 - 4) % 7;
  return ymd(p.y, p.m, p.d - sinceThu);
}

/** UTC calendar day as YYYY-MM-DD (Rockstar week keys use this). */
export function toIsoDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(raw) {
  const m = String(raw || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return ymd(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Thursday start + Wednesday end (UTC dates) for a Rockstar week key. */
export function weekBounds(weekStart) {
  const start =
    weekStart instanceof Date
      ? ymd(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate())
      : parseISODate(weekStart);
  if (!start) return null;
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + 6);
  return { start, end };
}

/** True when any parsed job date falls in the given Rockstar week. */
export function isJobInWeek(item, weekStart) {
  const bounds = weekBounds(weekStart);
  if (!bounds) return false;
  const hint = bounds.start;
  return jobDates(item, hint).some((d) => d >= bounds.start && d <= bounds.end);
}

function collectTitleDates(title, yearHint) {
  const t = String(title || "");
  const out = [];
  const iso = t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g);
  for (const m of iso) out.push(ymd(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const zh = t.matchAll(/(\d{1,2})\s*月\s*(\d{1,2})\s*日?/g);
  for (const m of zh) out.push(ymd(yearHint, Number(m[1]) - 1, Number(m[2])));
  const en = t.matchAll(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*[-–—]\s*(?:(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?)?(?:,\s*(\d{4}))?/gi,
  );
  for (const m of en) {
    const y = m[5] ? Number(m[5]) : yearHint;
    const m1 = MONTHS[m[1].toLowerCase()];
    if (m1) out.push(ymd(y, m1 - 1, Number(m[2])));
    if (m[4]) {
      const m2 = m[3] ? MONTHS[m[3].toLowerCase()] : m1;
      if (m2) out.push(ymd(y, m2 - 1, Number(m[4])));
    }
  }
  return out.filter((d) => !Number.isNaN(d.getTime()));
}

export function jobDates(item, now = new Date()) {
  const yearHint = taipeiParts(now).y;
  const dates = [];
  const updated = parseISODate(item?.updated);
  if (updated) dates.push(updated);
  dates.push(...collectTitleDates(`${item?.title || ""} ${item?.title_en || ""}`, yearHint));
  return dates;
}

export function isThisWeekJob(item, now = new Date()) {
  const ref = now instanceof Date ? now : new Date(now);
  const start = rockstarWeekStart(ref);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return jobDates(item, ref).some((d) => d >= start && d <= end);
}

export function thisWeekJobs(list, now = new Date(), max = THIS_WEEK_MAX) {
  return (list || []).filter((it) => isThisWeekJob(it, now)).slice(0, max);
}

/** Previous Rockstar Thursday (UTC date), the week whose bonuses are still the latest post. */
export function previousRockstarWeekStart(now = new Date()) {
  const start = rockstarWeekStart(now);
  const prev = new Date(start.getTime());
  prev.setUTCDate(prev.getUTCDate() - 7);
  return prev;
}

/**
 * Weekly-update cards only — not an arbitrary job that happens to share a date.
 * Used when this Rockstar week has no article yet (Thursday, before the new post).
 */
export function isWeeklyUpdateCard(item) {
  const blob = `${item?.title || ""} ${item?.title_en || ""}`;
  return /weekly(?:\s+updates?)?|每週更新|每周更新|bonuses?\s*(?:&|and)\s*discounts|獎勵與折扣/i.test(blob);
}

/**
 * Home money list. This Rockstar week's jobs when any exist.
 * When the new weekly is not in the snapshot yet, keep the previous week's
 * single weekly-update card so Thursday morning is not an empty list.
 * Does not reopen the old ≤8-day age backdoor for non-weekly cards.
 */
export function homeMoneyJobs(list, now = new Date(), max = THIS_WEEK_MAX) {
  const current = thisWeekJobs(list, now, max);
  if (current.length) return current;
  const prev = previousRockstarWeekStart(now);
  const carried = (list || [])
    .filter((it) => it?.title && it?.url && isJobInWeek(it, prev) && isWeeklyUpdateCard(it))
    .sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));
  return carried.slice(0, 1);
}

/** Number the currently visible job cards 1, 2, … regardless of source rank. */
export function withDisplayRanks(list) {
  return (list || []).map((item, i) => ({ ...item, rank: i + 1 }));
}

/**
 * Owned Short slot 1: featured only while its date / title week is still inside
 * the CH-00 / jobs window. No date and no parseable week words (e.g. “This Weekend”
 * alone) → leave as-is. Never invent a video_id.
 */
export function isOwnedShortThisWeek(short, now = new Date()) {
  if (!short) return false;
  const title = `${short.title || ""} ${short.title_en || ""}`;
  const item = { title, title_en: short.title_en || "", updated: short.date || "" };
  if (!jobDates(item, now).length) return true;
  return isThisWeekJob(item, now);
}
