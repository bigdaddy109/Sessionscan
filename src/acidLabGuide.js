/**
 * Acid Lab guide at /guides/acid-lab/ (+ /zh/).
 * English paragraphs are the owner-approved wording — do not paraphrase them.
 * Traditional Chinese follows the same sections for the /zh/ shell.
 *
 * LONG_VIDEO_ID: 11-character YouTube id for the full run. Replace this constant
 * to swap the embed. An empty string renders the "coming soon" note and no iframe.
 */

import { t } from "./i18n.js";

export const ACID_LAB_SHORT_ID = "LL3J2wKC_Ik";
/** Owner-specified embed URL (not youtube-nocookie). */
export const ACID_LAB_SHORT_EMBED_URL = "https://www.youtube.com/embed/LL3J2wKC_Ik";
export const ACID_LAB_SHORT_WATCH_URL = "https://youtube.com/shorts/LL3J2wKC_Ik";

/** Full-run YouTube id. Set to "" to hide the embed and show the coming-soon note. */
export const LONG_VIDEO_ID = "RC1hc3u9sOk";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export const ACID_LAB_COPY = {
  en: {
    title: "Acid Lab Guide: Sell for 50% More (Tested)",
    quick:
      "Quick answer: rename your product first and sell in a public lobby. In our test the same 40 units went from $62,360 to $93,510.",
    sections: [
      {
        id: "get-lab",
        heading: "How to get the Acid Lab",
        body: "Do Dax's six First Dose missions, then the lab steal setup. You get the Acid Lab, which is the Brickade truck, when it's finished. Our payouts per mission are in the video below.",
      },
      {
        id: "rename",
        heading: "Step 1: Rename your product (+5%)",
        body: "Interaction Menu → Services Vehicles → Acid Lab → Product Name. You pick from a list, and the first rename is free. In our test the value per unit went from $1,485 to $1,559.",
      },
      {
        id: "public-lobby",
        heading: "Step 2: Sell in a public lobby (up to +50%)",
        body: "Sell value rises with the number of rival players in the session. Our 40-unit sale was listed at $62,360 and paid out $93,510, about 1.5 times as much.",
      },
      {
        id: "no-upgrade",
        heading: "Without the equipment upgrade",
        body: "A full supply bar costs $60,000 when supplies are under 20 units. It makes 50 units worth $74,250 at base price, so buying supplies barely pays unless you rename and sell public. Free resupply missions add 25 units each.",
      },
    ],
    watch: "Watch the full run",
  },
  zh: {
    title: "迷幻藥實驗室攻略：多賣 50%（實測）",
    quick:
      "快速答案：先改產品名稱，再到公開大廳販售。我們實測同一批 40 單位從 $62,360 變成 $93,510。",
    sections: [
      {
        id: "get-lab",
        heading: "如何取得迷幻藥實驗室",
        body: "先做完 Dax 的六個 First Dose 任務，再做搶走實驗室的前置。完成後你會得到迷幻藥實驗室，也就是 Brickade 卡車。各任務分紅在下方影片。",
      },
      {
        id: "rename",
        heading: "步驟 1：替產品改名（+5%）",
        body: "互動選單 → 服務載具 → 迷幻藥實驗室 → 產品名稱。從清單裡挑一個，第一次改名免費。我們實測每單位價值從 $1,485 變成 $1,559。",
      },
      {
        id: "public-lobby",
        heading: "步驟 2：在公開大廳販售（最高 +50%）",
        body: "販售價值會隨同場其他玩家人數上升。我們這筆 40 單位標價 $62,360，實拿 $93,510，大約是 1.5 倍。",
      },
      {
        id: "no-upgrade",
        heading: "沒有設備升級時",
        body: "補給低於 20 單位時，補滿補給條要 $60,000。以原價可做出 50 單位、價值 $74,250，所以買補給幾乎不划算，除非你改名並在公開大廳賣。免費補貨任務每次增加 25 單位。",
      },
    ],
    watch: "看完整流程",
  },
};

/** Published shell entry. Same object the nav, sitemap, and dev server consume. */
export const ACID_LAB_GUIDE = {
  id: "acid-lab-guide",
  path: "guides/acid-lab/",
  navKey: "navAcidLab",
  titleKey: "pageAcidLabTitle",
  descKey: "pageAcidLabDesc",
  headingKey: "pageAcidLabHeading",
  stub: false,
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Long-form slot. Empty or invalid LONG_VIDEO_ID renders the coming-soon note
 * and zero iframes so a missing id cannot point at a broken embed.
 */
export function acidLabLongVideoHtml(id = LONG_VIDEO_ID, lang = "en") {
  const ui = lang === "zh" ? "zh" : "en";
  const vid = String(id ?? "").trim();
  if (!YT_ID.test(vid)) {
    return `<!-- LONG_VIDEO_ID: set src/acidLabGuide.js LONG_VIDEO_ID to an 11-character YouTube id. Empty renders this note and no iframe. -->
      <p class="acid-long-soon" data-acid-long="pending">${esc(t("acidLabLongSoon", {}, ui))}</p>`;
  }
  const src = `https://www.youtube.com/embed/${vid}`;
  const title = t("acidLabLongTitle", {}, ui);
  return `<!-- LONG_VIDEO_ID: ${esc(vid)} — replace the constant in src/acidLabGuide.js to swap this embed. -->
      <div class="acid-long">
        <iframe src="${src}" title="${esc(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>`;
}

function acidLabShortHtml(ui) {
  const title = ACID_LAB_COPY[ui].title;
  return `<div class="acid-short">
        <iframe src="${ACID_LAB_SHORT_EMBED_URL}" title="${esc(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>
      <p class="acid-short-caption"><a href="${esc(ACID_LAB_SHORT_WATCH_URL)}" target="_blank" rel="noopener noreferrer">${esc(t("acidLabShortWatch", {}, ui))}</a></p>`;
}

/** Guide body (h1 through the Short). Shell chrome (nav, meta, related) stays in sitePages. */
export function renderAcidLabGuideBody(lang = "en", { longVideoId = LONG_VIDEO_ID } = {}) {
  const ui = lang === "zh" ? "zh" : "en";
  const copy = ACID_LAB_COPY[ui];
  const sections = copy.sections
    .map(
      (section) => `<section class="acid-section" id="${esc(section.id)}">
        <h2>${esc(section.heading)}</h2>
        <p>${esc(section.body)}</p>
      </section>`,
    )
    .join("\n");
  return `<article class="acid-guide">
      <h1 data-i18n="${esc(ACID_LAB_GUIDE.headingKey)}">${esc(copy.title)}</h1>
      <p class="acid-quick">${esc(copy.quick)}</p>
      ${sections}
      <section class="acid-section" id="watch-run">
        <h2>${esc(copy.watch)}</h2>
        ${acidLabLongVideoHtml(longVideoId, ui)}
        ${acidLabShortHtml(ui)}
      </section>
    </article>`;
}
