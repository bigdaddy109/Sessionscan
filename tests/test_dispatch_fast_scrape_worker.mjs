#!/usr/bin/env node
/**
 * Why this test matters: the Worker is the only reliable trigger for the fast
 * scrape cadence. A wrong cron (e.g. hourly) or wrong workflow filename would
 * either burn Actions minutes or 404 forever after deploy — catch that in CI
 * without needing Cloudflare credentials.
 *
 * Named exports on the entry module are also fatal: Workers treat them as
 * handlers, so `export const CRON_EVERY_2H` fails the isolate with
 * "Incorrect type for map entry 'CRON_EVERY_2H'" and every route returns 1101.
 * Constants and helpers stay in lib.js; index.js may only default-export.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../workers/dispatch-fast-scrape/src/index.js";
import {
  CRON_EVERY_2H,
  DEFAULT_OWNER,
  DEFAULT_REPO,
  DEFAULT_REF,
  DEFAULT_WORKFLOW_FILE,
  dispatchFastScrape,
  healthPayload,
} from "../workers/dispatch-fast-scrape/src/lib.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = resolve(root, "workers/dispatch-fast-scrape");

function fail(msg, extra) {
  console.error(msg, extra ?? "");
  process.exit(1);
}

if (CRON_EVERY_2H !== "0 */2 * * *") {
  fail("CRON_EVERY_2H must be every 2 hours UTC", CRON_EVERY_2H);
}
if (DEFAULT_WORKFLOW_FILE !== "fast.yml") {
  fail("must dispatch sibling fast.yml", DEFAULT_WORKFLOW_FILE);
}
if (DEFAULT_OWNER !== "bigdaddy109" || DEFAULT_REPO !== "Sessionscan") {
  fail("owner/repo defaults drift", `${DEFAULT_OWNER}/${DEFAULT_REPO}`);
}
if (DEFAULT_REF !== "main") fail("must dispatch main", DEFAULT_REF);

const entry = readFileSync(resolve(workerDir, "src/index.js"), "utf8");
if (/^export\s+(const|function|async|class|let|var|\{)/m.test(entry)) {
  fail("Worker entry must not named-export; move symbols to lib.js");
}
if (!entry.includes('from "./lib.js"')) {
  fail("Worker entry must import helpers from lib.js");
}
if (!/^export default \{/m.test(entry)) {
  fail("Worker entry must default-export the fetch/scheduled handlers");
}

const toml = readFileSync(resolve(workerDir, "wrangler.toml"), "utf8");
if (!toml.includes(`crons = ["${CRON_EVERY_2H}"]`)) {
  fail("wrangler.toml cron must match CRON_EVERY_2H");
}
if (!toml.includes('WORKFLOW_FILE = "fast.yml"')) {
  fail("wrangler.toml must target fast.yml");
}
if (/^\s*GITHUB_PAT\s*=/m.test(toml) || /\b(ghp_|github_pat_)/.test(toml)) {
  fail("wrangler.toml must not embed GITHUB_PAT or a token value");
}

// Missing secret must fail closed.
try {
  await dispatchFastScrape({});
  fail("dispatch without GITHUB_PAT must throw");
} catch (err) {
  if (!String(err).includes("GITHUB_PAT")) {
    fail("missing-PAT error should mention GITHUB_PAT", err);
  }
}

// Happy path: POST workflow_dispatch with Bearer PAT, expect 204.
const calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url, init });
  return { ok: true, status: 204, text: async () => "" };
};

const result = await dispatchFastScrape(
  { GITHUB_PAT: "test-pat-not-real" },
  fakeFetch
);
if (!result.ok || result.status !== 204) fail("expected ok 204", result);
if (calls.length !== 1) fail("expected one fetch", calls.length);

const { url, init } = calls[0];
const expectedUrl =
  "https://api.github.com/repos/bigdaddy109/Sessionscan/actions/workflows/fast.yml/dispatches";
if (url !== expectedUrl) fail("dispatch URL mismatch", url);
if (init.method !== "POST") fail("must POST");
if (init.headers.Authorization !== "Bearer test-pat-not-real") {
  fail("must send Bearer PAT");
}
const body = JSON.parse(init.body);
if (body.ref !== "main") fail("must dispatch ref main", body);

// API error surfaces status + body (operator can see it in Worker logs).
const errFetch = async () => ({
  ok: false,
  status: 404,
  text: async () => '{"message":"Not Found"}',
});
try {
  await dispatchFastScrape({ GITHUB_PAT: "x" }, errFetch);
  fail("404 must throw");
} catch (err) {
  if (!String(err).includes("404")) fail("error should include status", err);
}

// HTTP /health must exist so CF probes stop returning 1101 (no-fetch module).
if (typeof worker.fetch !== "function") fail("Worker must export fetch for /health");
const healthEnv = { GITHUB_PAT: "x", WORKFLOW_FILE: "fast.yml" };
const hp = healthPayload(healthEnv);
if (!hp.ok || hp.cron !== CRON_EVERY_2H || hp.hasGithubPat !== true) {
  fail("healthPayload shape", hp);
}
const healthRes = await worker.fetch(
  new Request("https://example.workers.dev/health"),
  healthEnv,
);
if (healthRes.status !== 200) fail("GET /health status", healthRes.status);
const healthBody = await healthRes.json();
if (healthBody.hasGithubPat !== true || healthBody.workflow !== "fast.yml") {
  fail("GET /health body", healthBody);
}
// Must not leak the secret value (only a boolean flag).
if (Object.values(healthBody).some((v) => v === "x" || v === healthEnv.GITHUB_PAT)) {
  fail("health must not echo PAT value", healthBody);
}
const missing = healthPayload({});
if (missing.hasGithubPat !== false) fail("missing PAT must report false");

const notFound = await worker.fetch(
  new Request("https://example.workers.dev/"),
  {},
);
if (notFound.status !== 404) fail("non-health paths must 404", notFound.status);

console.log("test_dispatch_fast_scrape_worker: ok");
