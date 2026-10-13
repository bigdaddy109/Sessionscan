# sessionscan-dispatch-fast-scrape

Cloudflare Worker that cron-triggers every **2 hours** and calls GitHub
`workflow_dispatch` on `.github/workflows/fast.yml` (YT / Shorts / X-only scrape).

This directory is **not** part of the Vite site build. Deploy with Wrangler against
a Cloudflare account that owns the Worker.

## Merge order

1. Land the sibling **fast scrape** workflow on `main` (`.github/workflows/fast.yml`
   with `on: workflow_dispatch`).
2. Merge this Worker.
3. Create the fine-grained PAT + set Worker secrets, then `wrangler deploy`.

Until `fast.yml` exists on `main`, cron runs will get HTTP 404 from the Actions API.

## Required secret (names only — values never in git)

| Name | Where | Purpose |
|------|--------|---------|
| `GITHUB_PAT` | Cloudflare Worker secret (`wrangler secret put GITHUB_PAT`) | Fine-grained PAT; **Actions: Read and write** on `bigdaddy109/Sessionscan` |

Public IDs (for PAT / dashboard setup, not secrets):

- GitHub user `bigdaddy109` id: `195512960`
- Repository `bigdaddy109/Sessionscan` id: `1348144459`

Optional `[vars]` in `wrangler.toml` (already set): `GITHUB_OWNER`, `GITHUB_REPO`,
`GITHUB_REF`, `WORKFLOW_FILE`.

## Deploy (operator)

```bash
cd workers/dispatch-fast-scrape
npx wrangler@4 login
npx wrangler@4 secret put GITHUB_PAT   # paste PAT; do not echo into shell history files
npx wrangler@4 deploy
npx wrangler@4 deployments list
```

Manual smoke (after `fast.yml` is on main): Cloudflare dashboard → Worker →
Triggers → Cron → “Test”, or wait for the next `0 */2 * * *` UTC tick and check
the Actions tab for a `fast scrape` run with `workflow_dispatch`.

## HTTP health

After deploy, `GET /health` returns JSON (`ok`, `cron`, `workflow`, `ref`,
`hasGithubPat`). Without a `fetch` handler Cloudflare answers every path with
error **1101** — so ops probes must hit `/health`, not `/`. There is **no**
public HTTP trigger for `workflow_dispatch` (cron only).

```bash
curl -sS https://sessionscan-dispatch-fast-scrape.jeff-25f.workers.dev/health
```

`hasGithubPat: false` means re-run `wrangler secret put GITHUB_PAT`. Cron still
needs a successful Actions `fast scrape` run to prove end-to-end freshness.

## Non-goals

- No paid X API.
- No scrape logic, WebSub, or Pages CI-skip in this Worker.
- No unauthenticated HTTP dispatch endpoint.
