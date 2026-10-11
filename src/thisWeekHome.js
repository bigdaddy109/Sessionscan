/** Phase B home: this-week one-liners, Short pick, countdown to next Thursday update. */

import { youtubeId } from "./cardShare.js";
import { pickOfficialWeekly } from "./homeExtras.js";
import { t } from "./i18n.js";
import { isOwnedShortThisWeek, isThisWeekJob, rockstarWeekStart } from "./thisWeek.js";

/** Fixed verdict slots — always rendered so the home screen has one clear shape. */
export const WEEK_BULLET_CATEGORIES = [
  {
    id: "multipliers",
    labelKey: "weekBulletMultipliers",
    re: /(?:\b|[^\w])(\d{1,2})\s*[xX×]|雙倍|三倍|六倍|[2-9]x|\d+x\b|倍獎勵|GTA\$\s*\/\s*RP/i,
  },
  {
    id: "free",
    labelKey: "weekBulletFree",
    re: /\bfree\b|limited|限時|限免|贈送|gift|giveaway|試玩/i,
  },
  {
    id: "discounts",
    labelKey: "weekBulletDiscounts",
    re: /discount|折扣|減價|\bsale\b|bonuses?\s*&\s*discounts|獎勵與折扣/i,
  },
  {
    id: "podium",
    labelKey: "weekBulletPodium",
    re: /podium|prize\s*ride|展台|獎勵載具|幸運輪|lucky\s*wheel/i,
  },
  {
    id: "salvage_cayo",
    labelKey: "weekBulletSalvageCayo",
    re: /salvage|廢車場|cayo|perico|佩里克|打撈|panther|黑豹/i,
  },
];

export function nextWeeklyUpdateAt(now = new Date()) {
  const start = rockstarWeekStart(now);
  const next = new Date(start.getTime());
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

export function countdownParts(target, now = new Date()) {
  const end = target instanceof Date ? target.getTime() : new Date(target).getTime();
  const start = (now instanceof Date ? now : new Date(now)).getTime();
  let ms = Math.max(0, end - start);
  const totalMs = ms;
  const days = Math.floor(ms / 86400000);
  ms -= days * 86400000;
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  ms -= minutes * 60000;
  const seconds = Math.floor(ms / 1000);
  return { days, hours, minutes, seconds, totalMs };
}

function signalBlob(item) {
  return `${item?.title || ""} ${item?.title_en || ""} ${item?.text || ""} ${item?.blurb || ""}`;
}

/** Titles we may mine for one-liners (outbound only — no guide copy). */
export function weekSignalItems(data, now = new Date()) {
  const out = [];
  const seen = new Set();
  const push = (item, kind) => {
    if (!item) return;
    const title = String(item.title || item.title_en || "").trim();
    if (!title) return;
    const key = `${kind}:${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      kind,
      title,
      url: String(item.url || "").trim(),
      source: String(item.source || item.channel || "").trim(),
      updated: String(item.updated || item.date || "").trim(),
      blob: signalBlob(item),
    });
  };

  const weekly = pickOfficialWeekly(data || {});
  if (weekly) push(weekly, "official");

  for (const key of ["jobs_gtabase", "jobs_ign", "jobs_wiki"]) {
    for (const job of data?.[key] || []) {
      if (isThisWeekJob(job, now)) push(job, "job");
    }
  }

  const short = data?.sessionscan_slot?.short;
  if (short && isOwnedShortThisWeek(short, now)) {
    push(
      {
        title: short.title,
        title_en: short.title_en,
        url: short.url || (short.video_id ? `https://www.youtube.com/shorts/${short.video_id}` : ""),
        channel: short.channel || "SessionScan",
        date: short.date,
      },
      "short",
    );
  }

  return out;
}

function oneLineFromTitle(title, lang) {
  const raw = String(title || "").trim();
  if (!raw) return "";
  // Prefer the clause after the weekly date colon when present.
  const colon = raw.match(/:\s*(.+)$/);
  let line = (colon ? colon[1] : raw).replace(/\s+/g, " ").trim();
  if (line.length > 140) line = `${line.slice(0, 137).trim()}…`;
  if (lang === "zh" && !/[\u4e00-\u9fff]/.test(line)) {
    // Keep English title fragment; UI label is already zh.
    return line;
  }
  return line;
}

export function buildWeekBullets(data, now = new Date(), lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const signals = weekSignalItems(data, now);
  const weekly = pickOfficialWeekly(data || {});
  const fallbackUrl = weekly?.url || "";

  return WEEK_BULLET_CATEGORIES.map((cat) => {
    const hit = signals.find((s) => cat.re.test(s.blob));
    if (hit) {
      return {
        id: cat.id,
        label: t(cat.labelKey, {}, ui),
        reward: oneLineFromTitle(hit.title, ui),
        how: t("weekBulletHowSource", {}, ui),
        url: hit.url || fallbackUrl,
        pending: false,
      };
    }
    return {
      id: cat.id,
      label: t(cat.labelKey, {}, ui),
      reward: t("weekBulletPending", {}, ui),
      how: fallbackUrl ? t("weekBulletHowWeekly", {}, ui) : t("weekBulletHowNone", {}, ui),
      url: fallbackUrl,
      pending: true,
    };
  });
}

/** Owned Short only — never invent a video when the slot is empty. */
export function pickHomeShort(data, now = new Date()) {
  const short = data?.sessionscan_slot?.short;
  if (!short) return null;
  const id = youtubeId(short) || String(short.video_id || short.id || "").trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  if (!isOwnedShortThisWeek(short, now)) return null;
  return {
    ...short,
    video_id: id,
    owned: true,
    url: short.url || `https://www.youtube.com/shorts/${id}`,
  };
}
