import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page) {
  const submissions: Record<string, unknown>[] = [];
  const external: string[] = [];
  page.on('request', request => { if (/usesmileid|fims\.cosmopolitan/.test(request.url())) external.push(request.url()); });
  const session = {
    id: 'session-camera-test', policyCode: 'CONSUMER_VA_P0', state: 'REVIEW_REQUIRED',
    status: 'REVIEW_REQUIRED', nextAction: 'WAIT', reasonCodes: ['NIN_RECORD_FOUND'],
    expiresAt: '2099-01-01T00:00:00Z', updatedAt: '2026-11-07T00:00:00Z',
  };
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === '/api/auth/csrf') { await route.fulfill({ json: { csrf: 'a'.repeat(64) } }); return; }
    const body = request.method() === 'POST' ? request.postDataJSON() : {};
    const data: Record<string, unknown> = { session };
    if (path.endsWith('/biometrics')) {
      if (body.action === 'start') data.biometricCapture = {
        jobId: '11111111-1111-4111-8111-111111111111', token: 'a'.repeat(43),
        direction: 'LEFT', expiresAt: new Date(Date.now() + 120000).toISOString(),
      };
      else submissions.push(body);
    }
    await route.fulfill({ json: { success: true, data, correlationId: 'camera-test' } });
  });
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Personal verification' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Save consent' }).click();
  return { submissions, external };
}

test('self-hosted capture sends six camera frames and releases the camera', async ({ page }, info) => {
  const { submissions, external } = await setup(page);
  await page.getByRole('button', { name: 'Start selfie check' }).click();
  await expect(page.getByText('Selfie checks processed.', { exact: false })).toBeVisible({ timeout: 25000 });
  expect(submissions).toHaveLength(1);
  const body = submissions[0];
  expect(Object.keys(body).sort()).toEqual(['action', 'frames', 'jobId', 'token']);
  const frames = body.frames as string[];
  expect(frames).toHaveLength(6);
  expect(frames.every(frame => frame.startsWith('/9j/') && frame.length <= 240000)).toBe(true);
  expect(await page.locator('video').evaluate(video => (video as HTMLVideoElement).srcObject instanceof MediaStream && ((video as HTMLVideoElement).srcObject as MediaStream).getTracks().every(track => track.readyState === 'ended'))).toBe(true);
  expect(external).toEqual([]);
  await expect(page.getByText('review required', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify({ local: localStorage, session: sessionStorage }))).not.toContain(frames[0]);
  await page.screenshot({ path: `test-results/${info.project.name}-selfie-capture.png`, fullPage: true });
});

test('camera permission failure leaves verification pending and submits no evidence', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Camera permission denied.', 'NotAllowedError'); };
  });
  const { submissions } = await setup(page);
  await page.getByRole('button', { name: 'Start selfie check' }).click();
  await expect(page.getByText('Camera permission denied.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start selfie check' })).toBeEnabled();
  expect(submissions).toHaveLength(0);
});

test('cancelling capture stops the camera before evidence submission', async ({ page }) => {
  const { submissions } = await setup(page);
  await page.getByRole('button', { name: 'Start selfie check' }).click();
  await expect(page.getByLabel('Selfie camera preview')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel capture' }).click();
  await expect(page.getByText('Capture cancelled. Start again when you are ready.', { exact: true })).toBeVisible();
  expect(submissions).toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Start selfie check' })).toBeEnabled();
});
