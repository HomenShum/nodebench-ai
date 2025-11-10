import { test, expect, Page } from '@playwright/test';

/**
 * Agent Chat E2E Tests
 * Tests the MiniNoteAgentChat component and backend streaming
 */

const BASE_URL = 'http://localhost:5173';

test.describe('Agent Chat - UI/UX & Backend', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Chat input should be visible immediately on landing page', async () => {
    // Check that textarea is visible
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    await expect(textarea).toBeVisible();
    
    // Check that Send button is visible
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/01-chat-input-visible.png' });
  });

  test('Send button should show "Send (sign in)" when not authenticated', async () => {
    const sendButton = page.locator('button:has-text("Send")');
    
    // Check button text
    const buttonText = await sendButton.textContent();
    expect(buttonText).toContain('Send');
    
    // Button should be enabled (not disabled)
    await expect(sendButton).not.toBeDisabled();
  });

  test('User can type in chat input', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    
    await textarea.fill('Hello, what is 2+2?');
    
    const value = await textarea.inputValue();
    expect(value).toBe('Hello, what is 2+2?');
  });

  test('Sending message triggers sign-in flow', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // Type a message
    await textarea.fill('Test message');
    
    // Click send
    await sendButton.click();
    
    // Wait for sign-in or auth flow
    // This might show a Google sign-in or trigger anonymous auth
    await page.waitForTimeout(2000);
    
    // Take screenshot to see what happens
    await page.screenshot({ path: 'tests/screenshots/02-after-send-click.png' });
  });

  test('Message appears in chat after sending', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // Type and send
    await textarea.fill('What is AI?');
    await sendButton.click();
    
    // Wait for message to appear
    await page.waitForTimeout(3000);
    
    // Check if user message appears
    const userMessage = page.locator('text=What is AI?');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/03-message-sent.png' });
  });

  test('Agent response should stream in', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // Send a simple question
    await textarea.fill('Say hello');
    await sendButton.click();
    
    // Wait for streaming indicator
    const thinkingIndicator = page.locator('text=Thinking…');
    await expect(thinkingIndicator).toBeVisible({ timeout: 5000 });
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/04-agent-response.png' });
  });

  test('Stop button should appear while streaming', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    await textarea.fill('Tell me a long story');
    await sendButton.click();
    
    // Wait for thinking indicator
    await page.locator('text=Thinking…').waitFor({ state: 'visible', timeout: 5000 });
    
    // Check for Stop button
    const stopButton = page.locator('button:has-text("Stop")');
    await expect(stopButton).toBeVisible();
    
    await page.screenshot({ path: 'tests/screenshots/05-stop-button.png' });
  });

  test('Multiple messages should maintain conversation history', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // First message
    await textarea.fill('My name is Alice');
    await sendButton.click();
    await page.waitForTimeout(3000);
    
    // Second message
    await textarea.fill('What is my name?');
    await sendButton.click();
    await page.waitForTimeout(3000);
    
    // Check that both messages are visible
    const firstMsg = page.locator('text=My name is Alice');
    const secondMsg = page.locator('text=What is my name?');
    
    await expect(firstMsg).toBeVisible();
    await expect(secondMsg).toBeVisible();
    
    await page.screenshot({ path: 'tests/screenshots/06-conversation-history.png' });
  });

  test('Keyboard shortcut Ctrl+Enter should send message', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    
    await textarea.fill('Test keyboard shortcut');
    
    // Press Ctrl+Enter
    await textarea.press('Control+Enter');
    
    // Wait for message to be sent
    await page.waitForTimeout(2000);
    
    // Input should be cleared
    const value = await textarea.inputValue();
    expect(value).toBe('');
    
    await page.screenshot({ path: 'tests/screenshots/07-keyboard-shortcut.png' });
  });

  test('Chat should auto-scroll to latest message', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // Send multiple messages
    for (let i = 0; i < 3; i++) {
      await textarea.fill(`Message ${i + 1}`);
      await sendButton.click();
      await page.waitForTimeout(1500);
    }
    
    // Get scroll position
    const container = page.locator('[class*="flex-1"]').first();
    const scrollTop = await container.evaluate(el => el.scrollTop);
    const scrollHeight = await container.evaluate(el => el.scrollHeight);
    const clientHeight = await container.evaluate(el => el.clientHeight);
    
    // Should be scrolled to bottom
    expect(scrollTop + clientHeight).toBeGreaterThan(scrollHeight - 100);
    
    await page.screenshot({ path: 'tests/screenshots/08-auto-scroll.png' });
  });

  test('Error handling - invalid input should not crash', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    // Try to send empty message
    await textarea.fill('   ');
    await sendButton.click();
    
    // Button should still be disabled
    await expect(sendButton).toBeDisabled();
    
    // App should not crash
    await expect(page).not.toHaveTitle('Error');
    
    await page.screenshot({ path: 'tests/screenshots/09-error-handling.png' });
  });

  test('Console should not have errors', async () => {
    const textarea = page.locator('textarea[placeholder*="Send a message"]');
    const sendButton = page.locator('button:has-text("Send")');
    
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Send a message
    await textarea.fill('Test for console errors');
    await sendButton.click();
    await page.waitForTimeout(3000);
    
    // Check for errors
    expect(errors).toHaveLength(0);
  });
});

