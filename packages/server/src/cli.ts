#!/usr/bin/env node
/**
 * Shelltender CLI — start a single-port server (HTTP + WebSocket on one port).
 *
 *   shelltender serve [--port <n>] [--host <addr>] [--ws-path <p>]
 *
 * Binds to 127.0.0.1 by default; pass --host 0.0.0.0 to expose on the network
 * (which grants shell access — put auth or a reverse proxy in front).
 */
import { createShelltenderServer } from './createServer.js';

const argv = process.argv.slice(2);

function flag(name: string, fallback?: string): string | undefined {
  const idx = argv.findIndex((a) => a === name || a.startsWith(name + '='));
  if (idx === -1) return fallback;
  const a = argv[idx];
  if (a.includes('=')) return a.slice(a.indexOf('=') + 1);
  return argv[idx + 1] ?? fallback;
}

const HELP = `shelltender — web-based persistent terminal server

Usage:
  shelltender serve [options]

Options:
  --port <n>      Port to listen on        (default: 8080, or $SHELLTENDER_PORT)
  --host <addr>   Address to bind          (default: 127.0.0.1, or $SHELLTENDER_HOST)
                  Use 0.0.0.0 to expose on your network. This grants shell
                  access to anyone who can reach the port — front it with
                  authentication or a reverse proxy.
  --ws-path <p>   WebSocket path           (default: /ws)
  -h, --help      Show this help

Examples:
  shelltender serve
  shelltender serve --port 8083
  shelltender serve --host 0.0.0.0 --port 8080
  SHELLTENDER_PORT=9000 shelltender serve
`;

async function main(): Promise<void> {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(HELP);
    return;
  }

  const cmd = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'serve';
  if (cmd !== 'serve') {
    console.error(`Unknown command: ${cmd}\n\n${HELP}`);
    process.exit(1);
  }

  const port = parseInt(flag('--port', process.env.SHELLTENDER_PORT || '8080')!, 10);
  const host = flag('--host', process.env.SHELLTENDER_HOST || '127.0.0.1')!;
  const wsPath = flag('--ws-path', '/ws')!;

  const { url, wsUrl, stop } = await createShelltenderServer({ port, host, wsPath });

  const exposed = host === '0.0.0.0' || host === '::';
  console.log(`\n  Shelltender listening on ${host}:${port}`);
  console.log(`  HTTP:      ${url}`);
  console.log(`  WebSocket: ${wsUrl}`);
  if (exposed) {
    console.log(`\n  WARNING: bound to ${host} — this grants shell access to anyone who`);
    console.log(`  can reach this port. Put authentication or a reverse proxy in front.`);
  }
  console.log(`\n  Press Ctrl+C to stop.\n`);

  const shutdown = async () => {
    console.log('\nStopping Shelltender…');
    try {
      await stop();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start Shelltender:', err);
  process.exit(1);
});
