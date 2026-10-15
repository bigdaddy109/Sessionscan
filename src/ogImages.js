/** Page-specific Open Graph / Twitter share images (1200×630, absolute URLs). */

import { OG_IMAGE_URL, SITE_ORIGIN } from "./i18n.js";

/** Home keeps the original night-scan art. */
export const HOME_OG_IMAGE_URL = OG_IMAGE_URL;

/**
 * Shell / guide / archive pages — each file is 1200×630 under `public/`.
 * week-freeze reuses the archive art (same section).
 */
export const PAGE_OG_IMAGE_BY_ID = Object.freeze({
  week: `${SITE_ORIGIN}/og-week.jpg`,
  "week-freeze": `${SITE_ORIGIN}/og-week.jpg`,
  money: `${SITE_ORIGIN}/og-money.jpg`,
  businesses: `${SITE_ORIGIN}/og-businesses.jpg`,
  gta6: `${SITE_ORIGIN}/og-gta6.jpg`,
  about: `${SITE_ORIGIN}/og-about.jpg`,
});

/** Absolute og:image for a site page id; unknown ids fall back to home art. */
export function ogImageUrlForPage(pageId) {
  const id = String(pageId || "");
  return PAGE_OG_IMAGE_BY_ID[id] || HOME_OG_IMAGE_URL;
}

/** Filenames under `public/` that must ship with the build (excl. home og.jpg). */
export const PAGE_OG_IMAGE_FILES = Object.freeze([
  "og-week.jpg",
  "og-money.jpg",
  "og-businesses.jpg",
  "og-gta6.jpg",
  "og-about.jpg",
]);
