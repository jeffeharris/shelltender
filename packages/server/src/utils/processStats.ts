import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function getProcessMemoryUsage(pid: number): Promise<number | undefined> {
  try {
    if (os.platform() === 'linux') {
      // Read from /proc/[pid]/status
      const { stdout } = await execAsync(`cat /proc/${pid}/status | grep VmRSS`);
      const match = stdout.match(/VmRSS:\s+(\d+)\s+kB/);
      if (match) {
        return parseInt(match[1]) * 1024; // Convert KB to bytes
      }
    } else if (os.platform() === 'darwin') {
      // Use ps on macOS
      const { stdout } = await execAsync(`ps -o rss= -p ${pid}`);
      const rss = parseInt(stdout.trim());
      if (!isNaN(rss)) {
        return rss * 1024; // ps returns in KB
      }
    }
  } catch (error) {
    // Process doesn't exist or permission denied
  }
  return undefined;
}

export async function getProcessCpuUsage(pid: number): Promise<number | undefined> {
  try {
    if (os.platform() === 'linux' || os.platform() === 'darwin') {
      // Use ps for CPU percentage
      const { stdout } = await execAsync(`ps -o %cpu= -p ${pid}`);
      const cpu = parseFloat(stdout.trim());
      if (!isNaN(cpu)) {
        return cpu;
      }
    }
  } catch (error) {
    // Process doesn't exist or permission denied
  }
  return undefined;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}