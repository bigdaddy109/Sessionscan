# YouTube WebSub (@sessionscan)

Near-real-time refresh of Jeff’s owned Shorts/videos via **free** YouTube Atom RSS + Google PubSubHubbub (WebSub). **No YouTube Data API key** and **no paid X API**.

On push, this Worker `workflow_dispatch`es [`.github/workflows/owned-refresh.yml`](../../.github/workflows/owned-refresh.yml), which runs `python scraper.py --owned-only` (Atom RSS first, HTML `/shorts` fallback) and commits to the `data` branch.

## Constants

| Item | Value |
|------|--------|
| Channel | `@sessionscan` |
| Channel id | `UCfpCdZdtCdCFNXuEW9xvZcQ` |
| Topic (subscribe this) | `https://www.youtube.com/feeds/videos.xml?channel_id=UCfpCdZdtCdCFNXuEW9xvZcQ` |
| Hub | `https://pubsubhubbub.appspot.com/subscribe` |
| Workflow | `owned-refresh.yml` (override with `WORKFLOW_FILE=fast.yml` to retarget to full fast scrape) |

## Deploy (Cloudflare Worker)

Pages Functions can host the same GET/POST callback, but a Worker is the documented path (cron lease renew + secrets).

1. Install Wrangler and log in: `npm i -g wrangler && wrangler login`
2. From this directory: `wrangler deploy`
3. Set secrets:
   ```bash
   wrangler secret put GITHUB_PAT    # fine-grained PAT: Actions write on bigdaddy109/Sessionscan
   wrangler secret put HUB_SECRET    # random string; also used when subscribing
   ```
4. Set `CALLBACK_URL` in the dashboard or `[vars]` to the Worker URL, e.g. `https://sessionscan-youtube-websub.<subdomain>.workers.dev` (no path, or with trailing slash — Worker normalizes).
5. Confirm `GET /health` → `ok`.

### GitHub PAT scopes

Fine-grained personal access token on `bigdaddy109/Sessionscan`:

- **Contents**: read (not required for dispatch-only, but harmless)
- **Actions**: read and write (needed for `workflow_dispatch`)

Store only in Worker secrets — never in the repo.

## Subscribe the hub

Subscriptions expire (often ~5 days). The Worker cron renews when `CALLBACK_URL` is set; you can also subscribe once manually.

### Option A — Hub web UI

1. Open https://pubsubhubbub.appspot.com/subscribe
2. **Callback URL**: your Worker origin, e.g. `https://sessionscan-youtube-websub.<subdomain>.workers.dev/`
3. **Topic URL**: `https://www.youtube.com/feeds/videos.xml?channel_id=UCfpCdZdtCdCFNXuEW9xvZcQ`
4. **Verify type**: async
5. **Mode**: subscribe
6. Optional: same **secret** as `HUB_SECRET`
7. Submit — hub GETs the callback with `hub.challenge`; Worker echoes it when `hub.topic` matches.

### Option B — curl

```bash
CALLBACK='https://sessionscan-youtube-websub.<subdomain>.workers.dev/'
SECRET='your-hub-secret'

curl -sS -X POST 'https://pubsubhubbub.appspot.com/subscribe' \
  -d "hub.mode=subscribe" \
  -d "hub.callback=${CALLBACK}" \
  -d "hub.topic=https://www.youtube.com/feeds/videos.xml?channel_id=UCfpCdZdtCdCFNXuEW9xvZcQ" \
  -d "hub.verify=async" \
  -d "hub.lease_seconds=432000" \
  -d "hub.secret=${SECRET}"
```

Expect HTTP `202` / `204` from the hub after verification succeeds.

### Option C — Worker `/renew`

With secrets configured and `CALLBACK_URL` set:

```bash
curl -X POST "https://sessionscan-youtube-websub.<subdomain>.workers.dev/renew"
```

## What happens on a new upload

1. YouTube publishes an Atom notification to the hub.
2. Hub `POST`s Atom XML to the Worker (optional `X-Hub-Signature: sha1=…`).
3. Worker checks owned channel id + cooldown (default 5 minutes).
4. Worker calls GitHub Actions `workflow_dispatch` on `owned-refresh.yml` @ `main`.
5. Job overlays `data` JSON, runs `--owned-only`, `build_site.py`, pushes `data` if changed.
6. `pages.yml` `workflow_run` listens for `owned refresh` (same CI-skip path as daily／fast) and deploys.

## Retargeting to fast scrape

`fast.yml` is already on `main`. Keep the default `owned-refresh.yml` for a light `@sessionscan` slot refresh, or set Worker var `WORKFLOW_FILE=fast.yml` to dispatch the broader videos／Shorts／X scrape instead.

## Local tests

```bash
node tests/test_youtube_websub.mjs
python3 tests/test_pipeline.py   # includes owned Atom RSS cases
```

## Out of scope

- Cloudflare 2h scrape cron (separate PR)
- Skipping Pages CI on data deploys (separate PR)
- Paid X API / YouTube Data API
