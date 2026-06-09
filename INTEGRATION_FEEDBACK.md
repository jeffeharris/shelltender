# Shelltender — Integration & DX Feedback

Written 2026-06-09, from integrating Shelltender into **Dev Portal** (a Go app
that opens in-browser terminals attached to per-worktree tmux sessions).

**TL;DR:** the engine is great, the on-ramps are missing. The WebSocket
protocol and `SessionOptions` model made the *integration logic* trivial and it
worked first-try once wired. Everything that cost time was **getting a server
running** and **reusing the client outside React**. The notes below are ordered
roughly by impact.

---

## What's genuinely good (keep / lean into)

- **`SessionOptions`** (`packages/core/src/types/session.ts`) is exactly right:
  `id`, `command`, `args`, `cwd`, `env`, `restrictToPath`, `blockedCommands`,
  `readOnlyMode`. "Run `tmux new-session -A` in this cwd" is one object.
- **Create-or-attach by `id`** — `create` with an existing id just reattaches
  (`WebSocketServer.handleCreateSession`). This is the killer feature; it's why
  persistent sessions survive a browser refresh and made the consumer dead
  simple.
- **Rock-solid once connected** — streaming, scrollback, resize all worked on
  the first try. That reliability is not common for terminal-over-WS.
- **The terminal event system** (AI-CLI detection: Claude thinking dots,
  prompts, completion) is genuinely novel — but nobody will discover it because
  they can't get past "how do I run the server" (see #1).

---

## High impact

### 1. No `shelltender serve` CLI / runnable binary
No package declares a `bin` (checked root + all `packages/*/package.json`). The
single-port server only exists as a library factory (`startShelltender` /
`createShelltenderServer`, `packages/server/src/createServer.ts:374`). There is
no `npx shelltender serve --port 8083`.

**Impact:** the #1 blocker. To run it you must write your own launcher or find
the buried one (#2). This is almost certainly why it's hard to actually *use*
in a project.

**Fix:** add a `bin` to `@shelltender/server` (or the combined package) —
`shelltender serve [--port] [--host] [--token]` wrapping `startShelltender`.

### 2. The only working single-port launcher is undiscoverable
`start-admin.js` (root) → `startShelltender(port)` is what actually runs a
single-port server with `/ws`. It is **not mentioned in README.md or
QUICKSTART.md** — only in `docs/CHANGELOG.md` and `docs/USING_v0.6.0.md`.

We hit two dead ends first: `node packages/server/dist/app.js` (doesn't exist)
and `npm run build:packages && npm start` (builds libs, not a server).

**Fix:** make the README Quick Start a copy-pasteable `node start-admin.js` (or
the CLI from #1), `SHELLTENDER_PORT=...`. Lead with the runnable path, not
"write your own server file."

### 3. Broken / misleading npm scripts
In root `package.json`:
- `dev:client: "cd client && npm run dev"` — **`client/` doesn't exist** (it's
  `packages/client` now). So `dev:client` and `dev:all` are broken.
- `dev: "tsx watch packages/server/src/app.ts"` — runs the *legacy dual-port*
  entry (#4), not the single-port server everything else documents.
- `start: "node dist/index.js"` — root `dist/index.js` isn't produced by the
  documented build; effectively dead.

**Impact:** every "just run the dev script" instinct fails or starts the wrong
server.

**Fix:** repoint `dev` to the single-port server; delete/repair `dev:client` /
`dev:all`; make `start` run the real entry.

### 4. Two conflicting server entry points / port models
- `packages/server/src/app.ts` — **dual-port**: HTTP server + a *separate* WS
  server on `WS_PORT` (default **8282**) (`app.ts:22-23, :109`).
- `createServer.ts` / `startShelltender` — **single-port**: HTTP + WS on one
  port at `/ws`. README, QUICKSTART, and `/api/health` (`mode:"single-port"`)
  all describe this one.

`npm run dev` runs the *dual-port* one. New users following the docs get a
different topology than the docs describe.

**Fix:** retire `app.ts` (or make it just call `startShelltender`). Have one
blessed entry.

### 5. Combined `shelltender` package mixes server + client under one export
`packages/shelltender/package.json` has a single `.` export and depends on both
`@shelltender/server` (which pulls **node-pty**, a native server-only module)
and `@shelltender/client` (**React**). The README's headline example
(`README.md:26`):
```ts
import { SessionManager, Terminal } from 'shelltender';
```
imports a server class *and* a React component from one entry point. That can't
work in a single runtime — a browser bundle can't include node-pty; a Node
server can't render the React `Terminal`. It's a bundler footgun.

**Fix:** split subpath exports (`shelltender/server`, `shelltender/client`) so
each side only pulls what it needs, and fix the README example. (Dev Portal
sidestepped this entirely by talking to the WS protocol directly — see #7.)

---

## Medium impact

### 6. No REST session creation (WebSocket-only)
Sessions can only be created via the WS `{type:'create'}` message. There's no
`POST /api/sessions` in the running server — although a test already references
one (`packages/server/src/__tests__/v0.6.1-fixes.test.ts:128`), so the intent
existed.

**Impact:** a non-JS or server-to-server consumer (e.g. Dev Portal's Go backend)
can't pre-create a session with a known id/cwd/command; you must open a WS just
to mint one.

**Fix:** add `POST /api/sessions` (body = `SessionOptions`) → `{ id }`.

### 7. No deep-linkable / embeddable client
The client ships only as React components (`@shelltender/client`). There's no
URL like `/terminal?sessionId=x` and no framework-agnostic mount. To put a
terminal in a non-React / no-build app, you must reimplement the client.

Dev Portal ended up writing a ~100-line vanilla `xterm.js` client against the
raw WS protocol and proxying `/ws` — which worked, but shouldn't have been
necessary.

**Fix:** ship a standalone embeddable terminal — an iframe page accepting
`?sessionId=&cwd=&command=`, and/or a UMD `mountTerminal(el, opts)` that doesn't
require React.

### 8. `create` message shape is inconsistent and undocumented
Server `handleCreateSession` reads `command`/`args`/`cwd` only from
`data.options` (`WebSocketServer.ts`, ~`const options = data.options || {}`).
But the React client builds the create message by spreading `sessionConfig` at
the **top level** (`packages/client/src/components/Terminal/Terminal.tsx:~440`),
not under `options`. So the client's own cwd/command path may not actually reach
the PTY, and a third-party integrator has to read the server source to learn the
wire format (I did).

**Fix:** accept `command/args/cwd` at top level *and* under `options`, pick one
canonically, and document the raw WS protocol (message types + field
placement).

### 9. `create` on an existing session returns no scrollback
The existing-session branch of `handleCreateSession` responds `created` but does
**not** send the buffer; only `connect` returns `scrollback`. The React client's
initial path sends only `create` (it sends `connect` on *reconnect*). So a fresh
attach to a live session can render empty until something else triggers a
connect.

**Fix:** include scrollback in `created` for existing sessions, or clearly
document the required `create` → `connect` sequence.

---

## Security / defaults

### 10. Default bind is `0.0.0.0` with unauthenticated shell access
**Resolved (CLI):** `shelltender serve` defaults to `127.0.0.1` and warns when
`--host 0.0.0.0` is passed. The library `createShelltenderServer` default was
intentionally left at `0.0.0.0` to avoid breaking existing embedders.

`startShelltender` / `start-admin.js` listen on all interfaces (observed:
`0.0.0.0:8083`) with no built-in auth — full shell to anyone on the network. The
README's Security section warns about it, but the *default* is wide open.

**Impact:** in Dev Portal we had to keep shelltender reachable and front it with
our own token + reverse proxy; a direct hit to `host:8083` still bypasses that.

**Fix:** default to `127.0.0.1`; require explicit `--host 0.0.0.0` to expose;
offer optional built-in token/bearer auth on `/ws` and `/api/*`.

### 11. SessionStore init race requires manual ordering
**Resolved:** `SessionManager` now initializes the store and restores sessions
on construction, exposing a `ready` promise; `createShelltender` awaits it. The
manual `sessionStore.initialize()` step is no longer required.

The README's "Important: Initialization Order" and the 0.7.0 changelog ("Fixed
critical SessionStore initialization race") mean consumers must
`await sessionStore.initialize()` *before* `new SessionManager(store)` or hit a
race.

**Fix:** have `SessionManager` create/await the store internally (or expose an
async `SessionManager.create()`), so there's no order to get wrong.

---

## Suggested order for a work session

1. **#1 + #2 + #3** — a `shelltender serve` CLI + fix/retire the dev scripts +
   README quick-start. Biggest unlock for "use it in a project," low effort.
2. **#4** — collapse to one server entry (kills a whole class of confusion).
3. **#7 + #6** — embeddable client + REST create. This is what makes Shelltender
   droppable into *any* app, not just React ones.
4. **#5, #8, #9** — packaging exports + protocol docs/consistency.
5. **#10, #11** — secure defaults + remove the init footgun.

Items #1–#4 alone would have turned this integration from an afternoon into ~10
minutes.
