// Cloud Agent dev entrypoint for the Express API server.
//
// The app uses the @neondatabase/serverless driver, which talks to Postgres
// over a WebSocket instead of raw TCP. To develop against a plain local
// Postgres, we run a tiny WebSocket<->TCP relay and point neonConfig at it.
// This file is dev tooling only; it is never used by the Vercel/production build.
import net from 'node:net';
import { createRequire } from 'node:module';
import ws, { WebSocketServer } from 'ws';

// db.ts is transpiled to CommonJS and `require()`s @neondatabase/serverless, which
// ships separate ESM and CJS builds with independent neonConfig singletons. Grab the
// CJS copy so our overrides land on the exact instance the server uses.
const require = createRequire(import.meta.url);
const { neonConfig } = require('@neondatabase/serverless');

const PROXY_PORT = Number(process.env.NEON_LOCAL_PROXY_PORT || 5433);
const PG_HOST = process.env.NEON_LOCAL_PG_HOST || '127.0.0.1';
const PG_PORT = Number(process.env.NEON_LOCAL_PG_PORT || 5432);

const wss = new WebSocketServer({ host: '127.0.0.1', port: PROXY_PORT });
wss.on('connection', (socketWs) => {
  const tcp = net.connect(PG_PORT, PG_HOST);
  tcp.on('data', (data) => {
    if (socketWs.readyState === socketWs.OPEN) socketWs.send(data);
  });
  socketWs.on('message', (data) => tcp.write(data));
  const cleanup = () => {
    try { tcp.destroy(); } catch {}
    try { socketWs.close(); } catch {}
  };
  socketWs.on('close', cleanup);
  socketWs.on('error', cleanup);
  tcp.on('close', cleanup);
  tcp.on('error', cleanup);
});
await new Promise((resolve) => wss.on('listening', resolve));
console.log(`[neon-local-proxy] ws://127.0.0.1:${PROXY_PORT} -> ${PG_HOST}:${PG_PORT}`);

// Point the Neon driver at the local relay over an insecure ws:// connection.
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;
neonConfig.forceDisablePgSSL = true;
neonConfig.wsProxy = () => `127.0.0.1:${PROXY_PORT}/v1`;

// Boot the real server (tsx transpiles the TypeScript on the fly).
await import('../server/index.ts');
