/**
 * Build-time CH-01 home list HTML. Matches the client default view:
 * GTABase · this Rockstar week · THIS_WEEK_MAX cards. Single source for
 * Vite transformIndexHtml and scripts/inject_static_jobs.mjs so / and /zh/
 * ship the same progressive-enhancement markup JS filters hydrate on top of.
 */
import { isThisWeekJob, THIS_WEEK_MAX, withDisplayRanks } from "./thisWeek.js";
import { cardActionsHtml, cardAttrs } from "./cardShare.js";

export const DEFAULT_HOME_JOBS_KEY = "jobs_gtabase";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Default home-tab jobs (same filter as main.js renderJobs with jobsSource=gtabase). */
export function selectHomeJobs(data, now = new Date(), max = THIS_WEEK_MAX) {
  const raw = data?.[DEFAULT_HOME_JOBS_KEY] || [];
  return raw.filter((item) => item?.title && item?.url && isThisWeekJob(item, now)).slice(0, max);
}

export function staticJobCardHtml(job, lang = "en") {
  const date = job.updated ? `<span>⏱ ${esc(job.updated)}</span>` : "";
  return `<article class="job-card" data-static-job ${cardAttrs(job)}>
      ${cardActionsHtml(job, "jobs", lang)}
      <div class="rank">${esc(job.rank)}</div>
      <h3><a href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">${esc(job.title)}</a></h3>
      <div class="card-meta"><span class="tag">${esc(job.source || "")}</span>${date}</div>
    </article>`;
}

/** Inner HTML for #jobList, or "" when this-week GTABase has nothing. */
export function renderStaticHomeJobList(data, { now = new Date(), lang = "en", max = THIS_WEEK_MAX } = {}) {
  const jobs = withDisplayRanks(selectHomeJobs(data, now, max));
  if (!jobs.length) return "";
  return jobs.map((job) => staticJobCardHtml(job, lang)).join("");
}

export function injectJobListHtml(html, cardsHtml) {
  if (!cardsHtml) return html;
  return html.replace(
    /<div class="job-list" id="jobList">[\s\S]*?<\/div>(?=\s*<\/section>)/,
    `<div class="job-list" id="jobList">${cardsHtml}</div>`,
  );
}
