import { vi } from 'vitest';

export const spawn = vi.fn(() => ({
  onData: vi.fn(),
  onExit: vi.fn(),
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  pid: 12345,
}));

export default { spawn };