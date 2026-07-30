const http = require('http');
const https = require('https');
const zlib = require('zlib');

// Moonshot AI → Kimi K3 (Cursor OpenAI-compatible proxy)
// Listens on 127.0.0.1:8787, forwards to api.moonshot.ai,
// rewrites ANY requested model to TARGET_MODEL and injects the real API key
// server-side, so Cursor only needs a dummy key.
const MOONSHOT_KEY = process.env.MOONSHOT_KEY;
const TARGET_MODEL = process.env.TARGET_MODEL || 'kimi-k3';
const UPSTREAM_HOST = process.env.MOONSHOT_HOST || 'api.moonshot.ai';
const PORT = Number(process.env.PORT || 8787);
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 10 * 60 * 1000);

if (!MOONSHOT_KEY) {
  console.error('Set MOONSHOT_KEY env var before starting.');
  process.exit(1);
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'content-encoding',
  'host',
  'authorization'
]);

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 64,
  timeout: UPSTREAM_TIMEOUT_MS
});

const server = http.createServer((req, res) => {
  const started = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  let body = Buffer.alloc(0);
  req.on('data', (chunk) => {
    body = Buffer.concat([body, chunk]);
  });

  req.on('end', () => {
    let bodyStr = body.toString('utf8');
    let stream = false;

    try {
      if (bodyStr) {
        const data = JSON.parse(bodyStr);
        data.model = TARGET_MODEL;
        stream = Boolean(data.stream);
        bodyStr = JSON.stringify(data);
      }
    } catch (e) {
      // pass through non-JSON bodies unchanged
    }

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const lk = k.toLowerCase();
      if (HOP_BY_HOP.has(lk)) continue;
      // Never forward client compression prefs — SSE must stay plain text for Cursor
      if (lk === 'accept-encoding') continue;
      headers[k] = v;
    }
    headers.host = UPSTREAM_HOST;
    headers.authorization = `Bearer ${MOONSHOT_KEY}`;
    headers['content-type'] = headers['content-type'] || 'application/json';
    headers['content-length'] = Buffer.byteLength(bodyStr);
    headers.accept = headers.accept || 'application/json';
    headers['accept-encoding'] = 'identity';
    headers.connection = 'keep-alive';

    const options = {
      hostname: UPSTREAM_HOST,
      path: req.url,
      method: req.method,
      headers,
      agent,
      timeout: UPSTREAM_TIMEOUT_MS
    };

    const proxyReq = https.request(options, (proxyRes) => {
      const encoding = String(proxyRes.headers['content-encoding'] || '').toLowerCase();
      const outHeaders = { ...proxyRes.headers };
      outHeaders['access-control-allow-origin'] = '*';
      delete outHeaders['content-encoding'];
      delete outHeaders['content-length'];
      delete outHeaders['transfer-encoding'];

      console.log(
        `[${new Date().toISOString()}] upstream ${proxyRes.statusCode} ` +
          `${req.url} stream=${stream} enc=${encoding || 'identity'} ${Date.now() - started}ms`
      );

      res.writeHead(proxyRes.statusCode, outHeaders);

      // Defense in depth: if upstream compresses anyway, decompress transparently
      let upstream = proxyRes;
      if (encoding.includes('gzip')) {
        upstream = proxyRes.pipe(zlib.createGunzip());
      } else if (encoding.includes('deflate')) {
        upstream = proxyRes.pipe(zlib.createInflate());
      } else if (encoding.includes('br')) {
        upstream = proxyRes.pipe(zlib.createBrotliDecompress());
      }
      upstream.on('error', (err) => {
        console.error(`[decompress error] ${err.message}`);
        res.destroy(err);
      });
      upstream.pipe(res);
    });

    proxyReq.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
      console.error(`[timeout] upstream after ${UPSTREAM_TIMEOUT_MS}ms`);
      proxyReq.destroy(new Error('Upstream timeout'));
    });

    proxyReq.on('error', (err) => {
      console.error(`[proxy error] ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
      }
      res.end(JSON.stringify({ error: { message: err.message, type: 'proxy_error' } }));
    });

    req.on('aborted', () => {
      proxyReq.destroy();
    });
    res.on('close', () => {
      if (!res.writableEnded) proxyRes.destroy();
    });

    if (bodyStr) proxyReq.write(bodyStr);
    proxyReq.end();
  });
});

server.requestTimeout = UPSTREAM_TIMEOUT_MS + 30_000;
server.headersTimeout = UPSTREAM_TIMEOUT_MS + 30_000;
server.keepAliveTimeout = 120_000;
server.timeout = 0; // disable idle socket timeout for long streams

server.listen(PORT, '127.0.0.1', () => {
  console.log(
    `Proxy running on http://127.0.0.1:${PORT} ` +
      `(upstream=${UPSTREAM_HOST} model=${TARGET_MODEL})`
  );
});
