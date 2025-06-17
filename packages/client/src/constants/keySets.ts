import { KeySet } from '../types/keyboard';

/**
 * Quick access keys - most commonly used
 */
export const QUICK_KEYS: KeySet = {
  id: 'quick',
  name: 'Quick',
  readonly: true,
  keys: [
    { label: 'Tab', type: 'special', value: 'tab' },
    { label: 'Enter', type: 'special', value: 'enter' },
    { label: 'Esc', type: 'special', value: 'escape' },
    { label: 'Ctrl+C', type: 'special', value: 'ctrl-c', style: 'danger' },
    { label: 'Ctrl+D', type: 'special', value: 'ctrl-d' },
    { label: 'Ctrl+Z', type: 'special', value: 'ctrl-z' },
    { label: '↑', type: 'special', value: 'up' },
    { label: '↓', type: 'special', value: 'down' },
    { label: '←', type: 'special', value: 'left' },
    { label: '→', type: 'special', value: 'right' },
    { label: 'Space', type: 'text', value: ' ', width: 2 },
    { label: '/', type: 'text', value: '/' },
    { label: '-', type: 'text', value: '-' },
    { label: '.', type: 'text', value: '.' },
    { label: '~', type: 'text', value: '~' },
  ]
};

/**
 * Navigation keys for cursor movement
 */
export const NAVIGATION_KEYS: KeySet = {
  id: 'navigation',
  name: 'Navigation',
  readonly: true,
  keys: [
    { label: 'Home', type: 'special', value: 'home' },
    { label: 'End', type: 'special', value: 'end' },
    { label: 'PgUp', type: 'special', value: 'pageup' },
    { label: 'PgDn', type: 'special', value: 'pagedown' },
    { label: '↑', type: 'special', value: 'up', width: 1 },
    { label: '↓', type: 'special', value: 'down', width: 1 },
    { label: '←', type: 'special', value: 'left', width: 1 },
    { label: '→', type: 'special', value: 'right', width: 1 },
    { label: 'Ctrl+A', type: 'special', value: 'ctrl-a' },
    { label: 'Ctrl+E', type: 'special', value: 'ctrl-e' },
    { label: 'Ctrl+B', type: 'special', value: 'ctrl-b' },
    { label: 'Ctrl+F', type: 'special', value: 'ctrl-f' },
    { label: 'Ctrl+P', type: 'special', value: 'ctrl-p' },
    { label: 'Ctrl+N', type: 'special', value: 'ctrl-n' },
  ]
};

/**
 * Control keys for terminal operations
 */
export const CONTROL_KEYS: KeySet = {
  id: 'control',
  name: 'Control',
  readonly: true,
  keys: [
    { label: 'Ctrl+C', type: 'special', value: 'ctrl-c', style: 'danger' },
    { label: 'Ctrl+D', type: 'special', value: 'ctrl-d', style: 'warning' },
    { label: 'Ctrl+Z', type: 'special', value: 'ctrl-z' },
    { label: 'Ctrl+L', type: 'special', value: 'ctrl-l' },
    { label: 'Ctrl+R', type: 'special', value: 'ctrl-r' },
    { label: 'Ctrl+S', type: 'special', value: 'ctrl-s' },
    { label: 'Ctrl+Q', type: 'special', value: 'ctrl-q' },
    { label: 'Ctrl+W', type: 'special', value: 'ctrl-w' },
    { label: 'Ctrl+U', type: 'special', value: 'ctrl-u' },
    { label: 'Ctrl+K', type: 'special', value: 'ctrl-k' },
    { label: 'Ctrl+T', type: 'special', value: 'ctrl-t' },
    { label: 'Ctrl+\\', type: 'text', value: '\x1c', style: 'danger' },
  ]
};

/**
 * Common Unix commands
 */
export const UNIX_KEYS: KeySet = {
  id: 'unix',
  name: 'Unix',
  readonly: true,
  keys: [
    { label: 'ls', type: 'command', value: 'ls -la' },
    { label: 'cd ..', type: 'command', value: 'cd ..' },
    { label: 'pwd', type: 'command', value: 'pwd' },
    { label: 'clear', type: 'command', value: 'clear', style: 'primary' },
    { label: 'ps', type: 'command', value: 'ps aux' },
    { label: 'top', type: 'command', value: 'top' },
    { label: 'df', type: 'command', value: 'df -h' },
    { label: 'du', type: 'command', value: 'du -sh *' },
    { label: 'grep', type: 'text', value: 'grep -r "" .' },
    { label: 'find', type: 'text', value: 'find . -name ""' },
    { label: 'chmod', type: 'text', value: 'chmod +x ' },
    { label: 'sudo', type: 'text', value: 'sudo ' },
    { label: 'exit', type: 'command', value: 'exit', style: 'danger' },
  ]
};

/**
 * Git commands
 */
export const GIT_KEYS: KeySet = {
  id: 'git',
  name: 'Git',
  readonly: true,
  keys: [
    { label: 'status', type: 'command', value: 'git status' },
    { label: 'add .', type: 'command', value: 'git add .' },
    { label: 'commit', type: 'text', value: 'git commit -m ""' },
    { label: 'push', type: 'command', value: 'git push' },
    { label: 'pull', type: 'command', value: 'git pull' },
    { label: 'log', type: 'command', value: 'git log --oneline -10' },
    { label: 'diff', type: 'command', value: 'git diff' },
    { label: 'branch', type: 'command', value: 'git branch' },
    { label: 'checkout', type: 'text', value: 'git checkout ' },
    { label: 'stash', type: 'command', value: 'git stash' },
    { label: 'reset', type: 'text', value: 'git reset ' },
    { label: 'rebase -i', type: 'text', value: 'git rebase -i ' },
  ]
};

/**
 * Function keys
 */
export const FUNCTION_KEYS: KeySet = {
  id: 'function',
  name: 'Function',
  readonly: true,
  keys: [
    { label: 'F1', type: 'special', value: 'f1' },
    { label: 'F2', type: 'special', value: 'f2' },
    { label: 'F3', type: 'special', value: 'f3' },
    { label: 'F4', type: 'special', value: 'f4' },
    { label: 'F5', type: 'special', value: 'f5' },
    { label: 'F6', type: 'special', value: 'f6' },
    { label: 'F7', type: 'special', value: 'f7' },
    { label: 'F8', type: 'special', value: 'f8' },
    { label: 'F9', type: 'special', value: 'f9' },
    { label: 'F10', type: 'special', value: 'f10' },
    { label: 'F11', type: 'special', value: 'f11' },
    { label: 'F12', type: 'special', value: 'f12' },
  ]
};

/**
 * All predefined key sets
 */
export const PREDEFINED_KEY_SETS: KeySet[] = [
  QUICK_KEYS,
  NAVIGATION_KEYS,
  CONTROL_KEYS,
  UNIX_KEYS,
  GIT_KEYS,
  FUNCTION_KEYS,
];

/**
 * Default keyboard preferences
 */
export const DEFAULT_KEYBOARD_PREFERENCES = {
  defaultKeySetId: 'quick',
  showHints: true,
  keyboardHeight: 12, // rem
  hapticFeedback: true,
  customKeySets: [],
};

/**
 * Map special keys to their terminal sequences
 */
export const SPECIAL_KEY_SEQUENCES: Record<string, string> = {
  'escape': '\x1b',
  'tab': '\t',
  'backspace': '\x7f',
  'enter': '\r',
  'up': '\x1b[A',
  'down': '\x1b[B',
  'left': '\x1b[D',
  'right': '\x1b[C',
  'home': '\x1b[H',
  'end': '\x1b[F',
  'pageup': '\x1b[5~',
  'pagedown': '\x1b[6~',
  'delete': '\x1b[3~',
  'ctrl-a': '\x01',
  'ctrl-b': '\x02',
  'ctrl-c': '\x03',
  'ctrl-d': '\x04',
  'ctrl-e': '\x05',
  'ctrl-f': '\x06',
  'ctrl-g': '\x07',
  'ctrl-h': '\x08',
  'ctrl-i': '\x09',
  'ctrl-j': '\x0a',
  'ctrl-k': '\x0b',
  'ctrl-l': '\x0c',
  'ctrl-m': '\x0d',
  'ctrl-n': '\x0e',
  'ctrl-o': '\x0f',
  'ctrl-p': '\x10',
  'ctrl-q': '\x11',
  'ctrl-r': '\x12',
  'ctrl-s': '\x13',
  'ctrl-t': '\x14',
  'ctrl-u': '\x15',
  'ctrl-v': '\x16',
  'ctrl-w': '\x17',
  'ctrl-x': '\x18',
  'ctrl-y': '\x19',
  'ctrl-z': '\x1a',
  'f1': '\x1bOP',
  'f2': '\x1bOQ',
  'f3': '\x1bOR',
  'f4': '\x1bOS',
  'f5': '\x1b[15~',
  'f6': '\x1b[17~',
  'f7': '\x1b[18~',
  'f8': '\x1b[19~',
  'f9': '\x1b[20~',
  'f10': '\x1b[21~',
  'f11': '\x1b[23~',
  'f12': '\x1b[24~',
};