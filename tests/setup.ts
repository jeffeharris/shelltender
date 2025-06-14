import { vi } from 'vitest';

// Mock node-pty globally
vi.mock('node-pty', () => {
  const mockPty = {
    onData: vi.fn(),
    onExit: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    kill: vi.fn(),
    pid: 12345,
  };
  
  return {
    default: {
      spawn: vi.fn(() => mockPty)
    },
    spawn: vi.fn(() => mockPty)
  };
});