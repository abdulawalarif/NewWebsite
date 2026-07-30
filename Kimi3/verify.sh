#!/usr/bin/env bash
# Sanity check: proxy up, tunnel up, upstream streams plain-text SSE.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
TUNNEL_LOG="/tmp/cloudflared-tunnel.log"
PORT="${PORT:-8787}"
URL_REGEX='https://[a-zA-Z0-9-]+\.trycloudflare\.com'

[[ -f "${ENV_FILE}" ]] && set -a && source "${ENV_FILE}" && set +a

FAIL=0

echo "== 1. Proxy local check =="
CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${PORT}/v1/models" || true)
if [[ "${CODE}" == "200" ]]; then
  echo "OK   proxy /v1/models -> 200"
else
  echo "FAIL proxy /v1/models -> ${CODE} (is start-kimi-tunnel.sh running?)"
  FAIL=1
fi

echo "== 2. Tunnel URL =="
TUNNEL_URL="$(grep -oE "${URL_REGEX}" "${TUNNEL_LOG}" 2>/dev/null | head -n1 || true)"
if [[ -n "${TUNNEL_URL}" ]]; then
  echo "OK   tunnel: ${TUNNEL_URL}"
else
  echo "FAIL no tunnel URL in ${TUNNEL_LOG}"
  FAIL=1
fi

echo "== 3. Upstream streaming check (plain SSE expected) =="
OUT=$(curl -s --max-time 30 -N "http://127.0.0.1:${PORT}/v1/chat/completions" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer sk-123' \
  -d '{"model":"gpt-4o","stream":true,"max_tokens":8,"messages":[{"role":"user","content":"Say OK"}]}' 2>&1 | head -c 400 || true)
if [[ "${OUT}" == *"data:"* ]]; then
  echo "OK   upstream streamed SSE: $(echo "${OUT}" | head -n1 | cut -c1-80)"
else
  echo "FAIL upstream response not SSE. First bytes:"
  echo "${OUT}" | head -c 200
  FAIL=1
fi

echo "== 4. Public tunnel end-to-end (may fail on GCE DNS — see README) =="
if [[ -n "${TUNNEL_URL}" ]]; then
  PCODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "${TUNNEL_URL}/v1/models" || true)
  if [[ "${PCODE}" == "200" ]]; then
    echo "OK   public URL -> 200"
  else
    echo "WARN public URL -> ${PCODE} (if this server can't resolve trycloudflare.com, test from local Cursor instead)"
  fi
fi

echo ""
if [[ "${FAIL}" == "0" ]]; then
  echo "ALL CORE CHECKS PASSED"
  [[ -n "${TUNNEL_URL}" ]] && echo "Cursor base URL: ${TUNNEL_URL}/v1"
else
  echo "CHECKS FAILED — see above"
  exit 1
fi
