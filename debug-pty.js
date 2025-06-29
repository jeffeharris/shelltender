const pty = require('node-pty');

console.log('Testing PTY spawn...');

try {
  const ptyProcess = pty.spawn('/bin/bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: {
      ...process.env,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      LC_CTYPE: 'en_US.UTF-8',
      TERM: 'xterm-256color',
    }
  });

  console.log('PTY spawned successfully');

  ptyProcess.onData((data) => {
    console.log('PTY output:', JSON.stringify(data));
  });

  ptyProcess.onExit((code, signal) => {
    console.log('PTY exited with code:', code, 'signal:', signal);
  });

  // Test writing to the PTY
  setTimeout(() => {
    console.log('Writing "echo hello" to PTY...');
    ptyProcess.write('echo hello\r');
  }, 1000);

  // Keep the process alive
  setTimeout(() => {
    console.log('Test complete');
    ptyProcess.kill();
    process.exit(0);
  }, 5000);

} catch (error) {
  console.error('Error spawning PTY:', error);
}