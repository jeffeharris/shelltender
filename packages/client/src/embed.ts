/**
 * Framework-agnostic embeddable terminal.
 *
 * `mountTerminal(element, opts)` wires Shelltender's WebSocketService (with its
 * built-in reconnect) to an xterm.js terminal — no React required. Use it:
 *
 *   - directly in any app:  mountTerminal(document.getElementById('term'), { sessionId, cwd })
 *   - via the served page:  <iframe src="/terminal?sessionId=...">
 *
 * Exposed both as the `@shelltender/client/embed` import and, in the IIFE
 * build, as the global `Shelltender.mountTerminal`.
 */
import { Terminal, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebSocketService } from './services/WebSocketService.js';

export interface MountTerminalOptions {
  /** WebSocket URL or path (default: '/ws'). Relative paths resolve against the page origin. */
  wsUrl?: string;
  /** Fixed session id — reused across reloads (create-or-attach). */
  sessionId?: string;
  /** Command to run (default: the server's shell). e.g. 'tmux'. */
  command?: string;
  /** Arguments for the command. e.g. ['new-session','-A','-s','mysession']. */
  args?: string[];
  /** Working directory for the session. */
  cwd?: string;
  /** Extra environment variables. */
  env?: Record<string, string>;
  fontSize?: number;
  fontFamily?: string;
  theme?: ITheme;
  /** Called with the session id once created/attached. */
  onReady?: (sessionId: string) => void;
  /** Called when the session exits. */
  onExit?: (exitCode?: number) => void;
}

export interface TerminalHandle {
  /** The underlying xterm.js Terminal. */
  terminal: Terminal;
  /** Re-fit to the container and tell the server the new size. */
  fit: () => void;
  /** Current session id (null until created). */
  getSessionId: () => string | null;
  /** Close the socket, detach listeners, dispose the terminal. */
  dispose: () => void;
}

const DEFAULT_THEME: ITheme = { background: '#0b1120', foreground: '#e2e8f0' };

export function mountTerminal(element: HTMLElement, options: MountTerminalOptions = {}): TerminalHandle {
  const term = new Terminal({
    cursorBlink: true,
    fontSize: options.fontSize ?? 13,
    fontFamily: options.fontFamily ?? 'ui-monospace, SFMono-Regular, Menlo, monospace',
    theme: options.theme ?? DEFAULT_THEME,
  });
  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  term.open(element);
  fitAddon.fit();

  let sessionId: string | null = null;
  const ws = new WebSocketService({ url: options.wsUrl ?? '/ws' });

  const sendResize = () => {
    if (sessionId) ws.send({ type: 'resize', sessionId, cols: term.cols, rows: term.rows } as any);
  };
  const fit = () => {
    fitAddon.fit();
    sendResize();
  };

  // `created` carries scrollback for an existing session (and is re-sent on
  // reconnect), so reset + rewrite gives the correct current state without
  // duplicating history.
  ws.on('created', (msg: any) => {
    sessionId = msg.sessionId;
    if (msg.scrollback) {
      term.reset();
      term.write(msg.scrollback);
    }
    fit();
    term.focus();
    if (sessionId) options.onReady?.(sessionId);
  });
  ws.on('output', (msg: any) => {
    if (msg.data) term.write(msg.data);
  });
  ws.on('exit', (msg: any) => {
    options.onExit?.(msg.exitCode);
  });

  // (Re)connect → create-or-attach the session. Fires again after a reconnect.
  ws.onConnect(() => {
    const sessionOptions: Record<string, unknown> = {};
    if (options.sessionId) sessionOptions.id = options.sessionId;
    if (options.command) sessionOptions.command = options.command;
    if (options.args) sessionOptions.args = options.args;
    if (options.cwd) sessionOptions.cwd = options.cwd;
    if (options.env) sessionOptions.env = options.env;
    ws.send({ type: 'create', cols: term.cols, rows: term.rows, options: sessionOptions } as any);
  });

  const dataSub = term.onData((data) => {
    if (sessionId) ws.send({ type: 'input', sessionId, data } as any);
  });

  const onWindowResize = () => fit();
  window.addEventListener('resize', onWindowResize);

  ws.connect();

  return {
    terminal: term,
    fit,
    getSessionId: () => sessionId,
    dispose: () => {
      window.removeEventListener('resize', onWindowResize);
      dataSub.dispose();
      ws.disconnect();
      term.dispose();
    },
  };
}
