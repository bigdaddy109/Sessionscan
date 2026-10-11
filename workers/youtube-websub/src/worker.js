/**
 * Cloudflare Worker: YouTube WebSub callback for @sessionscan.
 *
 * GET  /          — hub verification (echo hub.challenge)
 * POST /          — Atom notification → GitHub workflow_dispatch
 * GET  /health    — liveness
 * Cron            — renew hub subscription (lease; not the 2h scrape cron)
 *
 * Secrets (wrangler secret put):
 *   GITHUB_PAT     — fine-grained PAT with Actions: Write on this repo
 *   HUB_SECRET     — optional; sent as hub.secret on subscribe, verified on POST
 *
 * Vars (wrangler.toml [vars] or dashboard):
 *   GITHUB_REPO       — default bigdaddy109/Sessionscan
 *   WORKFLOW_FILE     — default owned-refresh.yml (retarget to fast scrape later if desired)
 *   DISPATCH_REF      — default main
 *   DISPATCH_COOLDOWN_SEC — default 300 (dedupe noisy title/description updates)
 */

import {
  DEFAULT_LEASE_SECONDS,
  DEFAULT_REF,
  DEFAULT_REPO,
  DEFAULT_WORKFLOW,
  HUB_SUBSCRIBE_URL,
  TOPIC_URL,
  buildSubscribeBody,
  githubDispatchUrl,
  parseAtomNotification,
  shouldDispatchNotification,
  topicMatchesOwned,
  verificationResponse,
  verifyHubSignature,
} from "./websub.js";

const COOLDOWN_CACHE_KEY = "https://sessionscan-websub.internal/last-dispatch";

async function renewSubscription(env, callbackUrl) {
  const body = buildSubscribeBody({
    callbackUrl,
    secret: env.HUB_SECRET || "",
    leaseSeconds: Number(env.LEASE_SECONDS || DEFAULT_LEASE_SECONDS),
  });
  const res = await fetch(HUB_SUBSCRIBE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  return { status: res.status, ok: res.ok || res.status === 202, topic: TOPIC_URL };
}

async function withinCooldown(env) {
  const sec = Number(env.DISPATCH_COOLDOWN_SEC || 300);
  if (!sec || sec <= 0) return false;
  try {
    const cache = caches.default;
    const hit = await cache.match(COOLDOWN_CACHE_KEY);
    return Boolean(hit);
  } catch {
    return false;
  }
}

async function markDispatched(env) {
  const sec = Number(env.DISPATCH_COOLDOWN_SEC || 300);
  if (!sec || sec <= 0) return;
  try {
    const cache = caches.default;
    await cache.put(
      COOLDOWN_CACHE_KEY,
      new Response("1", {
        headers: { "cache-control": `max-age=${sec}`, "content-type": "text/plain" },
      }),
    );
  } catch {
    /* best-effort */
  }
}

async function dispatchOwnedRefresh(env) {
  const token = env.GITHUB_PAT;
  if (!token) {
    return { ok: false, status: 500, detail: "GITHUB_PAT missing" };
  }
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const workflow = env.WORKFLOW_FILE || DEFAULT_WORKFLOW;
  const ref = env.DISPATCH_REF || DEFAULT_REF;
  const url = githubDispatchUrl(repo, workflow);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "sessionscan-youtube-websub",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({ ref }),
  });
  return { ok: res.status === 204, status: res.status, detail: await res.text() };
}

function publicCallbackUrl(request, env) {
  if (env.CALLBACK_URL) return env.CALLBACK_URL.replace(/\/+$/, "");
  const u = new URL(request.url);
  return `${u.origin}/`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });
    }

    if (request.method === "GET") {
      const result = verificationResponse(url.searchParams);
      return new Response(result.body, {
        status: result.status,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (request.method === "POST" && (url.pathname === "/" || url.pathname === "")) {
      const raw = await request.text();
      const sig = request.headers.get("x-hub-signature") || "";
      if (!(await verifyHubSignature(raw, sig, env.HUB_SECRET || ""))) {
        return new Response("bad signature", { status: 401 });
      }
      const parsed = parseAtomNotification(raw);
      if (!shouldDispatchNotification(parsed)) {
        return new Response("ignored", { status: 204 });
      }
      // Topic is implied by subscription; still refuse foreign channel ids when present.
      if (parsed.channelIds.length && !parsed.ownedChannel) {
        return new Response("wrong channel", { status: 403 });
      }
      if (await withinCooldown(env)) {
        return new Response("cooldown", { status: 202 });
      }
      const dispatched = await dispatchOwnedRefresh(env);
      if (dispatched.ok) await markDispatched(env);
      return new Response(dispatched.ok ? "dispatched" : `dispatch failed: ${dispatched.status}`, {
        status: dispatched.ok ? 204 : 502,
      });
    }

    if (request.method === "POST" && url.pathname === "/renew") {
      // Manual renew; protect with the same PAT presence (Worker is not public-admin).
      if (!env.GITHUB_PAT) {
        return new Response("unauthorized", { status: 401 });
      }
      const callback = publicCallbackUrl(request, env);
      const result = await renewSubscription(env, callback);
      return Response.json(result, { status: result.ok ? 200 : 502 });
    }

    return new Response("not found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    // Lease renewal only — not the proposal's 2h scrape cron.
    const callback = env.CALLBACK_URL;
    if (!callback) {
      console.warn("CALLBACK_URL unset; skip WebSub renew");
      return;
    }
    ctx.waitUntil(
      renewSubscription(env, callback.replace(/\/+$/, "") + "/").then((r) => {
        console.log("websub renew", r.status, r.ok, TOPIC_URL);
      }),
    );
  },
};

// Re-export for tests / docs clarity.
export { topicMatchesOwned, TOPIC_URL };
