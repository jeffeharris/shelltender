import { describe, it, expect } from 'vitest';
import { RestrictedShell } from '../../src/RestrictedShell.js';
import { SessionOptions } from '@shelltender/core';

describe('RestrictedShell', () => {
  describe('validateCommand', () => {
    it('should block specified commands', () => {
      const shell = new RestrictedShell({
        blockedCommands: ['rm', 'sudo', 'chmod']
      });

      expect(shell.validateCommand('rm -rf /')).toEqual({
        allowed: false,
        reason: "Command 'rm' is not allowed in this session"
      });

      expect(shell.validateCommand('sudo apt update')).toEqual({
        allowed: false,
        reason: "Command 'sudo' is not allowed in this session"
      });

      expect(shell.validateCommand('ls -la')).toEqual({
        allowed: true
      });
    });

    it('should block path traversal when restricted', () => {
      const shell = new RestrictedShell({
        restrictToPath: '/home/user/project',
        allowUpwardNavigation: false
      });

      expect(shell.validateCommand('cd ../')).toEqual({
        allowed: false,
        reason: 'Path traversal is not allowed'
      });

      expect(shell.validateCommand('cat ../../etc/passwd')).toEqual({
        allowed: false,
        reason: 'Path traversal is not allowed'
      });
    });

    it('should block absolute paths outside restricted area', () => {
      const shell = new RestrictedShell({
        restrictToPath: '/home/user/project'
      });

      expect(shell.validateCommand('cat /etc/passwd')).toEqual({
        allowed: false,
        reason: "Access to path '/etc/passwd' is not allowed"
      });

      expect(shell.validateCommand('ls /home/user/project/src')).toEqual({
        allowed: true
      });
    });

    it('should allow commands in read-only mode that don\'t write', () => {
      const shell = new RestrictedShell({
        readOnlyMode: true
      });

      expect(shell.validateCommand('ls')).toEqual({ allowed: true });
      expect(shell.validateCommand('cat file.txt')).toEqual({ allowed: true });
      expect(shell.validateCommand('rm file.txt')).toEqual({
        allowed: false,
        reason: "Command 'rm' is not allowed in this session"
      });
    });
  });

  describe('getInitScript', () => {
    it('should generate restriction script for path restrictions', () => {
      const shell = new RestrictedShell({
        restrictToPath: '/home/user/project'
      });

      const script = shell.getInitScript();
      expect(script).toContain('export RESTRICTED_PATH=');
      expect(script).toContain('cd()');
      expect(script).toContain('pwd()');
    });

    it('should generate command blocks', () => {
      const shell = new RestrictedShell({
        blockedCommands: ['sudo', 'rm']
      });

      const script = shell.getInitScript();
      expect(script).toContain('sudo() {');
      expect(script).toContain('rm() {');
      expect(script).toContain("Command 'sudo' is not allowed");
    });

    it('should disable history in restricted mode', () => {
      const shell = new RestrictedShell({
        restrictToPath: '/home/user'
      });

      const script = shell.getInitScript();
      expect(script).toContain('unset HISTFILE');
      expect(script).toContain('export HISTSIZE=0');
    });
  });

  describe('getShellCommand', () => {
    it('should return bash with rcfile for restrictions', () => {
      const shell = new RestrictedShell({
        restrictToPath: '/home/user/project'
      });

      const { command, args, env } = shell.getShellCommand();
      expect(command).toBe('/bin/bash');
      expect(args).toContain('--rcfile');
      expect(args.some(arg => arg.startsWith('/tmp/.terminal_init_'))).toBe(true);
    });

    it('should use custom command if provided', () => {
      const shell = new RestrictedShell({
        command: '/usr/bin/zsh',
        args: ['-i'],
        restrictToPath: '/home/user'
      });

      const { command, args } = shell.getShellCommand();
      expect(command).toBe('/usr/bin/zsh');
      expect(args).toContain('-i');
    });

    it('should set custom PS1 for restricted paths', () => {
      const shell = new RestrictedShell({
        restrictToPath: '/home/user/project'
      });

      const { env } = shell.getShellCommand();
      expect(env.PS1).toBe('[Restricted] \\w\\$ ');
    });
  });
});