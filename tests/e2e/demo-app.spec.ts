import { test, expect } from '@playwright/test';

test.describe('Shelltender Demo App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Wait for WebSocket connection
    await page.waitForSelector('[data-testid="ws-status"].connected', { timeout: 5000 });
  });

  test('should create a new terminal session', async ({ page }) => {
    // Click new session button
    await page.click('button:has-text("New")');
    
    // Wait for terminal to appear
    await page.waitForSelector('.xterm', { timeout: 5000 });
    
    // Check if terminal is ready
    const terminal = await page.locator('.xterm');
    await expect(terminal).toBeVisible();
  });

  test('should execute commands in terminal', async ({ page }) => {
    // Create session
    await page.click('button:has-text("New")');
    await page.waitForSelector('.xterm');
    
    // Type a command
    await page.keyboard.type('echo "Hello Shelltender"');
    await page.keyboard.press('Enter');
    
    // Check output appears
    await expect(page.locator('.xterm')).toContainText('Hello Shelltender');
  });

  test('should handle special keys', async ({ page }) => {
    await page.click('button:has-text("New")');
    await page.waitForSelector('.xterm');
    
    // Test Ctrl+C
    await page.keyboard.type('sleep 10');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    await page.keyboard.press('Control+C');
    
    // Should see interrupt
    await expect(page.locator('.xterm')).toContainText('^C');
  });

  test('should persist session on reload', async ({ page }) => {
    // Create session and run command
    await page.click('button:has-text("New")');
    await page.waitForSelector('.xterm');
    await page.keyboard.type('echo "Persistent message"');
    await page.keyboard.press('Enter');
    
    // Get session ID
    const sessionId = await page.getAttribute('[data-testid="current-session"]', 'data-session-id');
    
    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="ws-status"].connected');
    
    // Reconnect to session
    await page.click(`[data-testid="session-tab-${sessionId}"]`);
    
    // Check message is still there
    await expect(page.locator('.xterm')).toContainText('Persistent message');
  });

  test('should sync across multiple tabs', async ({ page, context }) => {
    // Create session in first tab
    await page.click('button:has-text("New")');
    await page.waitForSelector('.xterm');
    const sessionId = await page.getAttribute('[data-testid="current-session"]', 'data-session-id');
    
    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('http://localhost:5173');
    await page2.waitForSelector('[data-testid="ws-status"].connected');
    
    // Connect to same session
    await page2.click(`[data-testid="session-tab-${sessionId}"]`);
    
    // Type in first tab
    await page.keyboard.type('echo "From tab 1"');
    await page.keyboard.press('Enter');
    
    // Check it appears in second tab
    await expect(page2.locator('.xterm')).toContainText('From tab 1');
    
    // Type in second tab
    await page2.keyboard.type('echo "From tab 2"');
    await page2.keyboard.press('Enter');
    
    // Check it appears in first tab
    await expect(page.locator('.xterm')).toContainText('From tab 2');
  });

  test('should show pattern matches in event system', async ({ page }) => {
    // Create session
    await page.click('button:has-text("New")');
    await page.waitForSelector('.xterm');
    
    // Show pattern library
    await page.click('button:has-text("Show Pattern Library")');
    
    // Enable a pattern
    await page.click('text=Build Tools');
    await page.check('input[type="checkbox"]:has(+ div:has-text("npm-install"))');
    
    // Run npm install
    await page.keyboard.type('npm install');
    await page.keyboard.press('Enter');
    
    // Check for pattern match
    await expect(page.locator('.pattern-match-event')).toContainText('npm-install');
  });
});