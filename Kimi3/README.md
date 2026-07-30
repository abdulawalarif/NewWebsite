# Kimi3 — Cursor ↔ Kimi K3 via Moonshot Proxy + Cloudflare Tunnel

This folder lets **any Cursor instance** use **Kimi K3** (Moonshot AI) as if it were a normal OpenAI model — bypassing Cursor's model allowlist while billing to your existing Moonshot balance.

How it works:

```
Cursor ──HTTPS──▶ https://<random>.trycloudflare.com/v1   (Cloudflare quick tunnel)
                  │
                  ▼
        moonshot-proxy.js  (localhost:8787)
          • rewrites ANY model name → kimi-k3
          • injects the real MOONSHOT_KEY server-side
          • forces Accept-Encoding: identity + decompresses defensively
          • handles CORS, streaming SSE, long timeouts
                  │
                  ▼
          api.moonshot.ai  (your Moonshot billing)
```

## Files

| File | Purpose |
|---|---|
| `moonshot-proxy.js` | Zero-dependency Node.js proxy (Node 16+). Rewrites model, injects auth, guards SSE against gzip. |
| `start-kimi-tunnel.sh` | One-click launcher: starts proxy + tunnel, prints the public base URL. |
| `.env.example` | Template for secrets. Copy to `.env` — **never commit `.env`**. |
| `verify.sh` | Sanity check: confirms proxy + tunnel + upstream all respond. |

---

## Setup for a NEW Cursor agent (do these steps autonomously)

An AI agent reading this should execute the full setup without asking for help. Steps assume Linux with `sudo` available (tested on Debian/GCE).

### 1. Prerequisites

```bash
node --version        # need Node 16+ (18+ recommended)
command -v cloudflared || sudo npm install -g cloudflared
```

If the npm wrapper fails, install the official binary instead:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  -o /tmp/cloudflared && chmod +x /tmp/cloudflared && sudo mv /tmp/cloudflared /usr/local/bin/
```

### 2. Get the Moonshot API key

Ask the user for their Moonshot key (format `sk-...`), then:

```bash
cd Kimi3
cp .env.example .env
# write the key into .env as MOONSHOT_KEY=sk-...
chmod 600 .env
```

`.env` is gitignored. Never echo, log, or commit the key.

### 3. Launch

```bash
chmod +x start-kimi-tunnel.sh
./start-kimi-tunnel.sh
```

The script kills any stale proxy/tunnel, starts fresh ones, and prints:

```
===================================================
Public tunnel: https://<random>.trycloudflare.com
Cursor Override OpenAI Base URL: https://<random>.trycloudflare.com/v1
Cursor API key: any dummy string, e.g. sk-123
Cursor model: gpt-4o  (proxy rewrites -> kimi-k3)
===================================================
```

### 4. Configure Cursor (tell the user to do this)

1. **Settings → Models**
2. Enable **OpenAI API Key** → enter any dummy string (`sk-123`)
3. Enable **Override OpenAI Base URL** → paste `https://<random>.trycloudflare.com/v1`
4. Add custom model named **`gpt-4o`** (name doesn't matter — proxy forces `kimi-k3`)
5. Select `gpt-4o` in chat → done. All requests now run on Kimi K3 via Moonshot.

### 5. Verify (agent should run this before declaring success)

```bash
./verify.sh
```

Expected: proxy `200` on `/v1/models`, tunnel URL resolves, and a streamed chat completion returns Kimi output as plain SSE (`data: {...}` lines — **not** binary garbage).

---

## Known issues & fixes (read before debugging)

- **Quick tunnels die randomly** (typically after hours). Symptom in Cursor: `ERROR_NETWORK_ERROR` / `resource_exhausted`. Fix: re-run `./start-kimi-tunnel.sh`, give the user the NEW base URL, and have them update the override URL. This is normal Cloudflare quick-tunnel behavior, not a bug.
- **`Unparsable stream error chunk` (binary garbage in error)**: upstream sent gzip-compressed SSE. The proxy already prevents this (`Accept-Encoding: identity` + zlib fallback). If you see it, check the proxy log for `enc=gzip` — it means the guard was bypassed; don't remove the zlib code.
- **`resource_exhausted` in Cursor is often Cursor's own internal rate guard**, not Moonshot. Check `/tmp/moonshot-proxy.log`: if upstream returns `200`, the request reached Moonshot fine.
- **Can't resolve `*.trycloudflare.com` from the same server**: some cloud DNS (e.g. GCE metadata DNS) blocks it. The tunnel still works from the user's local Cursor — verify with `verify.sh` from a different network, or trust the user's local test.
- **Billing**: usage bills to Moonshot (platform.moonshot.ai), since that's the upstream. The proxy never touches Cursor's quota.
- **Non-streaming requests** may occasionally hit upstream timeouts; Cursor uses streaming, so this is a non-issue in practice.

## Environment overrides

| Var | Default | Meaning |
|---|---|---|
| `MOONSHOT_KEY` | — (required) | Moonshot API key |
| `TARGET_MODEL` | `kimi-k3` | Model forced on every request |
| `MOONSHOT_HOST` | `api.moonshot.ai` | Upstream host |
| `PORT` | `8787` | Local proxy port |
| `UPSTREAM_TIMEOUT_MS` | `600000` | Upstream request timeout (10 min) |

## Logs

- Proxy: `/tmp/moonshot-proxy.log` (upstream status codes, latency, stream flag)
- Tunnel: `/tmp/cloudflared-tunnel.log` (public URL, connection state)
