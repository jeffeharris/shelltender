/**
 * DEPRECATED legacy entry point.
 *
 * This used to start a *dual-port* server (HTTP on $PORT, a separate WebSocket
 * server on $WS_PORT) — which conflicted with the single-port server that the
 * README, QUICKSTART, /api/health, and the rest of the project describe.
 *
 * It now delegates to the canonical single-port server so there is exactly one
 * behavior. Prefer the CLI instead:
 *
 *   shelltender serve --port 8080        (or: node packages/server/dist/cli.js serve)
 *
 * Kept only so old references / muscle memory don't break.
 */
import { createShelltenderServer } from './createServer.js';

const port = parseInt(process.env.SHELLTENDER_PORT || process.env.PORT || '8080', 10);
const host = process.env.SHELLTENDER_HOST || '127.0.0.1';

createShelltenderServer({ port, host })
  .then(({ url, wsUrl }) => {
    console.log('[deprecated app.ts — use `shelltender serve`] single-port server started');
    console.log(`  HTTP:      ${url}`);
    console.log(`  WebSocket: ${wsUrl}`);
  })
  .catch((err) => {
    console.error('Failed to start Shelltender:', err);
    process.exit(1);
  });
