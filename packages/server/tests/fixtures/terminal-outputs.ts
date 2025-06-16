/**
 * Test fixtures for terminal output scenarios
 */

export const JEST_OUTPUT = `
 PASS  src/app.test.js
  ✓ should work (5ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
`;

export const BUILD_ERROR = `
ERROR in ./src/index.js
Module not found: Error: Can't resolve './missing'
`;

export const BUILD_SUCCESS = `
webpack 5.74.0 compiled successfully in 1523 ms
`;

export const NPM_PROGRESS = `
⸨⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⠂⸩ ⠙ fetchMetadata: sill resolveWithNewModule express@4.18.2 checking installable status
`;

export const PYTHON_ERROR = `
Traceback (most recent call last):
  File "test.py", line 10, in <module>
    print(undefined_var)
NameError: name 'undefined_var' is not defined
`;

export const BASH_PROMPT = 'user@hostname:~/projects$ ';
export const ZSH_PROMPT = 'user@hostname projects % ';

export const ANSI_COLORED = '\x1b[31mError:\x1b[0m File not found';
export const ANSI_CURSOR_UP = '\x1b[2A';
export const ANSI_CLEAR_SCREEN = '\x1b[2J';
export const ANSI_SET_TITLE = '\x1b]0;Terminal Title\x07';

export const MIXED_OUTPUT = `
Building project...
\x1b[32m✓\x1b[0m Compiled successfully
Tests: 15 passed, 0 failed
user@host:~/project$ 
`;

export const INTERACTIVE_PROMPT = `
Please enter your name: `;

export const PROGRESS_BAR = `
Downloading... [████████████████    ] 80%
`;

export const TEST_RESULTS_MOCHA = `
  15 passing (2s)
  3 failing
`;

export const MULTILINE_ERROR = `Line 1 of output
Error: Something went wrong
  at Object.<anonymous> (/path/to/file.js:10:15)
  at Module._compile (internal/modules/cjs/loader.js:1137:30)
More output after error`;