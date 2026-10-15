/**
 * Cloudflare Worker: cron every 2h → GitHub workflow_dispatch for the fast scrape.
 *
 * Dispatches `.github/workflows/fast.yml` on main (YT / Shorts / X only).
 * Secrets stay in the Worker env — never commit tokens.
 *
 * Required secrets (wrangler secret put / CF dashboard):
 *   GITHUB_PAT — fine-grained PAT with Actions: Read and write on this repo
 *
 * Optional vars (wrangler.toml [vars] or dashboard):
 *   GITHUB_OWNER, GITHUB_REPO, GITHUB_REF, WORKFLOW_FILE
 */

export const DEFAULT_OWNER = "bigdaddy109";
export const DEFAULT_REPO = "Sessionscan";
export const DEFAULT_REF = "main";
/** Sibling fast-scrape PR must land this path on main before the Worker can succeed. */
export const DEFAULT_WORKFLOW_FILE = "fast.yml";
/** Every 2 hours UTC — must match wrangler.toml triggers.crons. */
export const CRON_EVERY_2H = "0 */2 * * *";

/**
 * POST workflow_dispatch for the fast scrape workflow.
 * @param {object} env Worker env (secrets + vars)
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true, status: number }>}
 */
export async function dispatchFastScrape(env, fetchImpl = fetch) {
  const pat = env.GITHUB_PAT;
  if (!pat) {
    throw new Error("GITHUB_PAT secret is missing");
  }

  const owner = env.GITHUB_OWNER || DEFAULT_OWNER;
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const ref = env.GITHUB_REF || DEFAULT_REF;
  const workflowFile = env.WORKFLOW_FILE || DEFAULT_WORKFLOW_FILE;

  const url =
    `https://api.github.com/repos/${owner}/${repo}` +
    `/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;

  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${pat}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sessionscan-dispatch-fast-scrape",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref }),
  });

  if (res.status !== 204 && !res.ok) {
    const body = await res.text();
    throw new Error(
      `workflow_dispatch ${workflowFile} failed: ${res.status} ${body}`
    );
  }

  return { ok: true, status: res.status };
}

/**
 * Liveness response for ops probes (DNS alone is not enough — without a
 * `fetch` handler Cloudflare returns 1101 on every HTTP path).
 * @param {object} [env]
 */
export function healthPayload(env = {}) {
  return {
    ok: true,
    service: "sessionscan-dispatch-fast-scrape",
    cron: CRON_EVERY_2H,
    workflow: env.WORKFLOW_FILE || DEFAULT_WORKFLOW_FILE,
    ref: env.GITHUB_REF || DEFAULT_REF,
    // Never echo the PAT — only whether the secret slot is present.
    hasGithubPat: Boolean(env.GITHUB_PAT),
  };
}

