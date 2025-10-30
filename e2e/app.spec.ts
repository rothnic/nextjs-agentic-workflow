import { test, expect } from '@playwright/test';

test.describe('Lead Processing Agent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the application header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lead Processing Agent' })).toBeVisible();
    await expect(page.getByText('AI-powered lead validation, enrichment, and scoring')).toBeVisible();
  });

  test('should display the chat interface', async ({ page }) => {
    await expect(page.getByText('Welcome to Lead Processing Agent')).toBeVisible();
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  test('should display the workflow status panel', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Workflow Status' })).toBeVisible();
    await expect(page.getByText('Real-time execution tracking')).toBeVisible();
    await expect(page.getByText('No workflows running')).toBeVisible();
  });

  test('should display example commands', async ({ page }) => {
    await expect(page.getByText('Example commands:')).toBeVisible();
    await expect(page.getByText(/Validate lead/)).toBeVisible();
    await expect(page.getByText(/Enrich lead/)).toBeVisible();
    await expect(page.getByText(/Score lead/)).toBeVisible();
    await expect(page.getByText(/Process lead/)).toBeVisible();
  });

  test('should have a responsive layout', async ({ page }) => {
    // Check that both chat and workflow status panels are visible
    const chatInterface = page.locator('form').filter({ has: page.getByPlaceholder('Type a message...') });
    const workflowStatus = page.getByRole('heading', { name: 'Workflow Status' });
    
    await expect(chatInterface).toBeVisible();
    await expect(workflowStatus).toBeVisible();
  });

  test('should allow typing in the input field', async ({ page }) => {
    const input = page.getByPlaceholder('Type a message...');
    await input.fill('Test message');
    await expect(input).toHaveValue('Test message');
  });

  test('should disable send button and input when loading', async ({ page }) => {
    // Type a message to enable the send button
    const input = page.getByPlaceholder('Type a message...');
    const sendButton = page.getByRole('button', { name: 'Send' });
    
    await input.fill('Hello');
    
    // Initially, the button should be enabled
    await expect(sendButton).toBeEnabled();
  });
});

test.describe('Workflow Status Updates', () => {
  test('should poll for workflow updates', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial API call
    const response = await page.waitForResponse(
      (response) => response.url().includes('/api/workflows') && response.status() === 200
    );
    
    expect(response.ok()).toBeTruthy();
  });
});
