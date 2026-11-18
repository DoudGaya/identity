import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
test('real onboarding entry has no sample identity or simulated approval', async ({ page }, info) => {
  await page.goto('/onboarding');
  await expect(page.getByRole('heading', { name: 'Nillar Identity' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Personal verification' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Business verification' })).toHaveCount(0);
  await expect(page.getByText('00000000000')).toHaveCount(0);
  await expect(page.getByText(/simulated|demo outcome/i)).toHaveCount(0);
  await accessible(page);
  await page.screenshot({ path: `test-results/${info.project.name}-identity-entry.png`, fullPage: true });
});

test('FIMS journey submits through the gateway without external capture or automatic approval', async ({ page }) => {
  const external: string[] = [];
  const calls: { path: string; body: unknown }[] = [];
  page.on('request', request => {
    if (/usesmileid|fims\.cosmopolitan/.test(request.url())) external.push(request.url());
  });
  let session = {
    id: 'session-fims-test', policyCode: 'CONSUMER_VA_P0',
    state: 'CONSENT_REQUIRED', status: 'CONSENT_REQUIRED',
    nextAction: 'GRANT_CONSENT', reasonCodes: [] as string[],
    expiresAt: '2099-01-01T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z',
  };
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/auth/csrf') {
      await route.fulfill({ json: { csrf: 'a'.repeat(64) } });
      return;
    }
    const body = request.method() === 'POST' ? request.postDataJSON() : undefined;
    calls.push({ path, body });
    if (path.endsWith('/consent')) session = { ...session, status: 'IN_PROGRESS', state: 'READY', nextAction: 'SUBMIT_ATTRIBUTES' };
    if (path.endsWith('/submit')) session = {
      ...session, status: 'REVIEW_REQUIRED', state: 'REVIEW_REQUIRED', nextAction: 'WAIT',
      reasonCodes: ['NIN_RECORD_FOUND', 'IDENTITY_HOLDER_MATCH_REQUIRED'],
    };
    await route.fulfill({ json: { success: true, data: { session }, correlationId: 'test-fims' } });
  });
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Personal verification' }).click();
  await expect(page.getByRole('button', { name: 'Check NIN record' })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Save consent' }).click();
  await page.getByLabel('NIN', { exact: true }).fill('77777777777');
  await page.getByRole('button', { name: 'Save securely' }).click();
  await expect(page.getByLabel('NIN', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Check NIN record' }).click();
  await expect(page.getByText('review required', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Holder verification');
  await expect(page.getByRole('button', { name: 'Check NIN record' })).toBeDisabled();
  expect(calls.filter(call => call.path.endsWith('/submit'))).toEqual([
    { path: '/api/identity/sessions/session-fims-test/submit', body: { attributeType: 'NIN' } },
  ]);
  expect(calls.some(call => /capture|screening/.test(call.path))).toBe(false);
  expect(external).toEqual([]);
  expect(await page.evaluate(() => sessionStorage.getItem('nillar.identity.handoff'))).not.toContain('77777777777');
});
test('secure sign-in and unauthenticated gateway enforce access boundaries', async ({ page, request }) => {
  const response = await page.goto('/login');
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(response?.headers()['content-security-policy']).toContain('https://cdn.usesmileid.com');
  expect(response?.headers()['referrer-policy']).toBe('no-referrer');
  expect(response?.headers()['permissions-policy']).toContain('camera=(self "https://cdn.usesmileid.com")');
  expect(response?.headers()['cache-control']).toContain('no-store');
  await expect(page.locator('input[type=password]')).toHaveCount(1);
  const blocked = await request.get('/api/identity/sessions/session-1234');
  expect(blocked.status()).toBe(401);
  await accessible(page);
});
test('privacy describes documents, biometrics and business controlling persons', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: 'Your identity information' })).toBeVisible();
  await expect(page.getByText(/directors, beneficial owners and authorised signatories/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verification providers' })).toBeVisible();
  await accessible(page);
});
