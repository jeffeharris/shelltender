import * as path from 'path';
import * as fs from 'fs';
import { SessionOptions } from '../shared/types.js';

export class RestrictedShell {
  private restrictedPath: string;
  private blockedCommands: Set<string>;
  private allowUpward: boolean;

  constructor(private options: SessionOptions) {
    this.restrictedPath = options.restrictToPath 
      ? path.resolve(options.restrictToPath) 
      : options.cwd || process.env.HOME || '/';
    
    this.allowUpward = options.allowUpwardNavigation ?? !options.restrictToPath;
    
    this.blockedCommands = new Set(options.blockedCommands || [
      'sudo', 'su', 'chmod', 'chown', 'mount', 'umount'
    ]);
    
    if (options.readOnlyMode) {
      this.addReadOnlyRestrictions();
    }
  }

  private addReadOnlyRestrictions(): void {
    const writeCommands = [
      'rm', 'rmdir', 'mv', 'cp', 'mkdir', 'touch', 'dd',
      'nano', 'vim', 'vi', 'emacs', '>', '>>'
    ];
    writeCommands.forEach(cmd => this.blockedCommands.add(cmd));
  }

  // Create initialization script for the shell
  getInitScript(): string {
    const scripts: string[] = [];
    
    // Set up restricted PATH if needed
    if (this.options.restrictToPath) {
      scripts.push(`
        # Restrict navigation
        export RESTRICTED_PATH="${this.restrictedPath}"
        
        # Override cd command
        cd() {
          local target="$1"
          if [ -z "$target" ]; then
            target="$RESTRICTED_PATH"
          fi
          
          # Resolve the absolute path
          local abs_path=$(realpath -m "$target" 2>/dev/null || echo "$target")
          
          # Check if path is within restricted area
          if [[ ! "$abs_path" =~ ^"$RESTRICTED_PATH" ]]; then
            echo "Access denied: Cannot navigate outside restricted area" >&2
            return 1
          fi
          
          # Use builtin cd
          builtin cd "$target"
        }
        
        # Override pwd to show relative path
        pwd() {
          local current=$(builtin pwd)
          if [[ "$current" =~ ^"$RESTRICTED_PATH" ]]; then
            echo "\${current#\$RESTRICTED_PATH}" | sed 's/^$/\\//'
          else
            echo "/"
          fi
        }
      `);
    }
    
    // Block specific commands
    if (this.blockedCommands.size > 0) {
      for (const cmd of this.blockedCommands) {
        scripts.push(`
          ${cmd}() {
            echo "Command '${cmd}' is not allowed in this session" >&2
            return 1
          }
        `);
      }
    }
    
    // Set readonly mode
    if (this.options.readOnlyMode) {
      scripts.push(`
        # Redirect write operations
        set -o noclobber  # Prevent overwriting files
        
        # Make common directories read-only
        alias rm='echo "Write operations are disabled" >&2; false'
        alias touch='echo "Write operations are disabled" >&2; false'
      `);
    }
    
    // Prevent history file writing in restricted mode
    if (this.options.restrictToPath || this.options.readOnlyMode) {
      scripts.push(`
        unset HISTFILE
        export HISTSIZE=0
      `);
    }
    
    return scripts.join('\n');
  }
  
  // Validate a command before execution
  validateCommand(command: string): { allowed: boolean; reason?: string } {
    const parts = command.trim().split(/\s+/);
    const cmd = parts[0];
    
    // Check blocked commands
    if (this.blockedCommands.has(cmd)) {
      return { 
        allowed: false, 
        reason: `Command '${cmd}' is not allowed in this session` 
      };
    }
    
    // Check for path traversal attempts
    if (this.options.restrictToPath && !this.allowUpward) {
      if (command.includes('../') || command.includes('..\\')) {
        return { 
          allowed: false, 
          reason: 'Path traversal is not allowed' 
        };
      }
    }
    
    // Check for absolute paths outside restricted area
    if (this.options.restrictToPath) {
      const absolutePathRegex = /\/[^\s]+/g;
      const matches = command.match(absolutePathRegex) || [];
      
      for (const match of matches) {
        const absPath = path.resolve(match);
        if (!absPath.startsWith(this.restrictedPath)) {
          return { 
            allowed: false, 
            reason: `Access to path '${match}' is not allowed` 
          };
        }
      }
    }
    
    return { allowed: true };
  }
  
  // Get the shell command and args
  getShellCommand(): { command: string; args: string[]; env: Record<string, string> } {
    const initScript = this.getInitScript();
    const tempInitFile = `/tmp/.terminal_init_${Date.now()}.sh`;
    
    // We'll write the init script and source it
    fs.writeFileSync(tempInitFile, initScript);
    
    return {
      command: this.options.command || '/bin/bash',
      args: [
        '--rcfile', tempInitFile,
        ...(this.options.args || [])
      ],
      env: {
        ...this.options.env,
        ...(this.options.restrictToPath && {
          PS1: '[Restricted] \\w\\$ '
        })
      }
    };
  }
}