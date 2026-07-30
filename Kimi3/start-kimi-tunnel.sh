#!/usr/bin/env bash
# One-click: Moonshot/Kimi proxy + Cloudflare quick tunnel for Cursor.
# Prints the public base URL you paste into Cursor Settings → Models.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
PROXY_FILE="${SCRIPT_DIR}/moonshot-proxy.js"
TUNNEL_LOG="/tmp/cloudflared-tunnel.log"
PROXY_LOG="/tmp/moonshot-proxy.log"
PORT="${PORT:-8787}"
URL_REGEX='https://[a-zA-Z0-9-]+\.trycloudflare\.com'

# Load secrets (never committed — see .env.example)
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

if [[ -z "${MOONSHOT_KEY:-}" ]]; then
  echo "ERROR: MOONSHOT_KEY not set."
  echo "  cp ${SCRIPT_DIR}/.env.example ${ENV_FILE}"
  echo "  then edit ${ENV_FILE} and paste your Moonshot API key."
  exit 1
fi

command -v node >/dev/null || { echo "ERROR: node not found"; exit 1; }
command -v cloudflared >/dev/null || {
  echo "ERROR: cloudflared not found."
  echo "  Install: sudo npm install -g cloudflared  (community wrapper)"
  echo "  or the official apt repo from https://pkg.cloudflare.com/"
  exit 1
}

cleanup() {
  echo "Stopping proxy and tunnel..."
  [[ -n "${PROXY_PID:-}" ]] && kill "${PROXY_PID}" 2>/dev/null || true
  [[ -n "${TUNNEL_PID:-}" ]] && kill "${TUNNEL_PID}" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

# Stop old instances by PID (avoid pkill matching this shell's own cmdline)
ps -eo pid,cmd | awk -v f="node ${PROXY_FILE}" '$0 ~ f {print $1}' | while read -r p; do
  kill "$p" 2>/dev/null || true
done
ps -eo pid,cmd | awk '/cloudflared/ && /tunnel --url/ {print $1}' | while read -r p; do
  kill "$p" 2>/dev/null || true
done
sleep 1

# 1) Start proxy
: > "${PROXY_LOG}"
MOONSHOT_KEY="${MOONSHOT_KEY}" \
  TARGET_MODEL="${TARGET_MODEL:-kimi-k3}" \
  MOONSHOT_HOST="${MOONSHOT_HOST:-api.moonshot.ai}" \
  PORT="${PORT}" \
  nohup node "${PROXY_FILE}" >> "${PROXY_LOG}" 2>&1 &
PROXY_PID=$!
echo "Proxy PID ${PROXY_PID} (log: ${PROXY_LOG})"

for _ in $(seq 1 15); do
  curl -sf "http://127.0.0.1:${PORT}/v1/models" >/dev/null 2>&1 && break
  sleep 1
done
curl -sf "http://127.0.0.1:${PORT}/v1/models" >/dev/null || {
  echo "Proxy failed to start. Last log lines:" >&2
  tail -n 30 "${PROXY_LOG}" >&2 || true
  exit 1
}
echo "Proxy OK: http://127.0.0.1:${PORT} -> ${MOONSHOT_HOST:-api.moonshot.ai} (${TARGET_MODEL:-kimi-k3})"

# 2) Start tunnel
: > "${TUNNEL_LOG}"
nohup cloudflared tunnel --url "http://127.0.0.1:${PORT}" >> "${TUNNEL_LOG}" 2>&1 &
TUNNEL_PID=$!
echo "Tunnel PID ${TUNNEL_PID} (log: ${TUNNEL_LOG})"

TUNNEL_URL=""
for _ in $(seq 1 30); do
  TUNNEL_URL="$(grep -oE "${URL_REGEX}" "${TUNNEL_LOG}" | head -n1 || true)"
  [[ -n "${TUNNEL_URL}" ]] && break
  sleep 1
done

if [[ -z "${TUNNEL_URL}" ]]; then
  echo "Tunnel URL not found after 30s. Check ${TUNNEL_LOG}" >&2
  exit 1
fi

echo ""
echo "==================================================="
echo "Public tunnel: ${TUNNEL_URL}"
echo "Cursor Override OpenAI Base URL: ${TUNNEL_URL}/v1"
echo "Cursor API key: any dummy string, e.g. sk-123"
echo "Cursor model: gpt-4o  (proxy rewrites -> ${TARGET_MODEL:-kimi-k3})"
echo "==================================================="

if command -v xclip >/dev/null 2>&1; then
  printf '%s' "${TUNNEL_URL}/v1" | xclip -selection clipboard
  echo "Copied base URL to clipboard (xclip)."
elif command -v wl-copy >/dev/null 2>&1; then
  printf '%s' "${TUNNEL_URL}/v1" | wl-copy
  echo "Copied base URL to clipboard (wl-copy)."
fi

wait
