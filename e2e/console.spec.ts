import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { dashboardRoutes } from "../lib/console/routes";
const workspaceId = "workspace_synthetic",
  recordId = "12345678-1234-4234-9234-123456789abc",
  customerId = "12345678-1234-4234-9234-123456789abd";
const now = new Date().toISOString();
const workspace = {
  id: workspaceId,
  name: "Acme Financial",
  website: "https://example.test",
  businessType: "COMPANY",
  registrationNumber: "SYNTHETIC",
  useCase: "Synthetic account onboarding checks.",
  privacyUrl: "https://example.test/privacy",
  supportEmail: "support@example.test",
  returnOrigins: ["https://example.test"],
  retentionDays: 90,
  productionStatus: "NOT_REQUESTED",
  productionReason: null,
  productionRequestedAt: null,
  suspendedAt: null,
  role: "OWNER",
  memberId: "member_synthetic",
};
const user = {
  id: "user_synthetic",
  name: "Ada Okafor",
  email: "ada@example.test",
  emailVerified: true,
  mfa: true,
  sessionId: null,
};
const verification = {
  id: recordId,
  environment: "SANDBOX",
  reference: "application_1001",
  customerReference: "customer_1001",
  policyCode: "CONSUMER_VA_P0",
  status: "VERIFIED",
  reasonCodes: [],
  createdAt: now,
  updatedAt: now,
  expiresAt: "2099-01-01T00:00:00Z",
  completedAt: now,
  verifiedAt: now,
  assuranceExpiresAt: null,
  assuranceLevel: "SANDBOX",
  version: 2,
};
const endpoint = {
  id: recordId,
  description: "Primary receiver",
  url: "https://example.test/events",
  events: ["verification.verified"],
  environment: "SANDBOX",
  secretVersion: 1,
  disabledAt: null,
  createdAt: now,
  _count: { deliveries: 1 },
};
const delivery = {
  id: recordId,
  eventId: recordId,
  endpointId: recordId,
  status: "DELIVERED",
  attempts: 1,
  totalAttempts: 1,
  nextAttemptAt: now,
  responseStatus: 204,
  lastErrorCode: null,
  createdAt: now,
  deliveredAt: now,
  endpoint,
  event: { type: "verification.verified", payload: verification },
  history: [
    {
      id: recordId,
      attemptNumber: 1,
      responseStatus: 204,
      errorCode: null,
      durationMs: 84,
      createdAt: now,
    },
  ],
};
const summary = {
  counts: [
    { status: "VERIFIED", count: 124 },
    { status: "IN_PROGRESS", count: 8 },
    { status: "REVIEW_REQUIRED", count: 3 },
  ],
  recent: [verification],
  monthUsage: 135,
  customers: 130,
  failedDeliveries: 0,
  monthlyLimit: 1000,
  productionStatus: "NOT_REQUESTED",
  setup: {
    email: true,
    profile: true,
    mfa: true,
    apiKey: true,
    webhook: true,
    webhookDelivered: true,
    testVerification: true,
  },
};
async function fixture(
  page: Page,
  options: { role?: string; suspended?: boolean; empty?: boolean } = {},
) {
  await page
    .context()
    .addCookies([
      {
        name: "nillar_identity_access",
        value: "synthetic-browser-session",
        url: "http://127.0.0.1:3004",
        httpOnly: true,
      },
    ]);
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname,
      resource = path.split("/").slice(5).join("/");
    if (path === "/api/auth/csrf")
      return route.fulfill({ json: { csrf: "a".repeat(64) } });
    if (path === "/api/account/sessions")
      return route.fulfill({ json: { success: true, data: { sessions: [] } } });
    let data: unknown;
    if (path === "/api/client/me")
      data = {
        user,
        workspaces: options.empty
          ? []
          : [
              {
                ...workspace,
                role: options.role || workspace.role,
                suspendedAt: options.suspended ? now : null,
              },
            ],
      };
    else if (resource === "summary") data = summary;
    else if (resource === "usage")
      data = {
        days: 30,
        daily: [{ day: now.slice(0, 10), total: 135, verified: 124 }],
        requests: [{ status: 200, count: 278 }],
        activeKeys: 1,
        billing: {
          currency: "NGN",
          status: "AGREEMENT_REQUIRED",
          message:
            "Commercial terms are agreed with Nillar before production activation.",
        },
      };
    else if (
      resource === "verifications" &&
      route.request().method() === "POST"
    )
      data = {
        verification: { ...verification, status: "CREATED" },
        launchUrl: "http://127.0.0.1:3004/start#ticket=synthetic",
        created: true,
      };
    else if (resource === "verifications")
      data = { items: [verification], nextCursor: null };
    else if (resource.startsWith("verifications/"))
      data = {
        verification,
        events: [
          {
            id: recordId,
            type: "verification.verified",
            createdAt: now,
            version: 2,
          },
        ],
      };
    else if (resource === "customers")
      data = {
        items: [
          {
            id: customerId,
            reference: "customer_1001",
            environment: "SANDBOX",
            createdAt: now,
            _count: { verifications: 1 },
          },
        ],
        nextCursor: null,
      };
    else if (resource.startsWith("customers/"))
      data = {
        customer: {
          id: customerId,
          reference: "customer_1001",
          environment: "SANDBOX",
          createdAt: now,
        },
        verifications: [verification],
      };
    else if (resource === "keys" && route.request().method() === "POST")
      data = { secret: "ni_test_SYNTHETIC_ONE_TIME_KEY_NOT_A_REAL_CREDENTIAL" };
    else if (resource === "keys") data = { items: [] };
    else if (resource === "webhooks") data = { items: [endpoint] };
    else if (resource.startsWith("webhooks/"))
      data = { endpoint, deliveries: [delivery] };
    else if (resource === "deliveries")
      data = { items: [delivery], nextCursor: null };
    else if (resource.startsWith("deliveries/")) data = { delivery };
    else if (resource === "members")
      data = {
        members: [
          {
            id: workspace.memberId,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: options.role || "OWNER",
            mfa: true,
            createdAt: now,
          },
        ],
        invitations: [],
      };
    else if (resource === "policies")
      data = { policies: [], retention: { days: 90, mode: "REPORT_ONLY" } };
    else if (resource === "activity" || resource === "requests")
      data = { items: [], nextCursor: null };
    else if (resource === "settings") data = { workspace };
    else
      return route.fulfill({
        status: 404,
        json: {
          success: false,
          error: { message: `Unconfigured synthetic resource: ${resource}` },
        },
      });
    await route.fulfill({ json: { success: true, data } });
  });
}
async function accessible(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("all client routes and scoped detail pages render without errors", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await fixture(page);
  for (const path of [
    ...Object.keys(dashboardRoutes),
    `verifications/${recordId}`,
    `customers/${customerId}`,
    `developers/webhooks/${recordId}`,
  ]) {
    await page.goto(`/dashboard${path ? "/" + path : ""}`);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator('main').getByRole("alert")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test("overview and mobile navigation are accessible", async ({
  page,
}, info) => {
  await fixture(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your verification workspace." }),
  ).toBeVisible();
  await accessible(page);
  await page.screenshot({
    path: `../.codex-preview/identity-client-2026-11-17/${info.project.name}-client-overview.png`,
    fullPage: true,
  });
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "API keys", exact: true })
      .click();
    await expect(page).toHaveURL(/developers\/keys/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
});
test("one-time key creation closes without browser storage", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/dashboard/developers/keys");
  await page
    .getByRole("button", { name: /Create.*key/i })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('input[name="name"]').fill("Server integration");
  await dialog.locator('input[name="securityCode"]').fill("123456");
  await dialog.getByRole("button", { name: /Create.*key/i }).click();
  await expect(
    page.getByText("ni_test_SYNTHETIC_ONE_TIME_KEY_NOT_A_REAL_CREDENTIAL"),
  ).toBeVisible();
  await accessible(page);
  await page
    .getByRole("button", { name: /saved|done|close/i })
    .last()
    .click();
  expect(
    await page.evaluate(
      () => JSON.stringify(localStorage) + JSON.stringify(sessionStorage),
    ),
  ).not.toContain("SYNTHETIC_ONE_TIME_KEY");
  await expect(
    page.getByText("ni_test_SYNTHETIC_ONE_TIME_KEY_NOT_A_REAL_CREDENTIAL"),
  ).toHaveCount(0);
});
test("delivery details show attempt history and event references", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/dashboard/developers/deliveries");
  await page
    .getByRole("button", { name: "verification.verified", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Attempt history");
  await expect(page.getByRole("dialog")).toContainText("84 ms");
  await accessible(page);
});
test("new workspace setup and account security have accessible forms", async ({
  page,
}, info) => {
  await fixture(page, { empty: true });
  await page.goto("/dashboard/setup");
  await expect(page.locator("main h1")).toBeVisible();
  await accessible(page);
  await page.screenshot({
    path: `../.codex-preview/identity-client-2026-11-17/${info.project.name}-client-setup.png`,
    fullPage: true,
  });
  await page.goto("/dashboard/settings/security");
  await expect(
    page.getByRole("heading", { name: "Signed-in devices" }),
  ).toBeVisible();
  await accessible(page);
});
test("viewer and paused workspaces have clear access limits", async ({
  page,
}) => {
  await fixture(page, { role: "VIEWER" });
  await page.goto("/dashboard");
  await expect(page.locator("main h1")).toBeVisible();
  await expect(
    page
      .locator("main")
      .getByRole("link", { name: "New verification", exact: true }),
  ).toHaveCount(0);
  await page.unroute("**/api/**");
  await fixture(page, { suspended: true });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "This workspace is paused." }),
  ).toBeVisible();
  await expect(
    page.locator("main").getByRole("link", { name: /Contact support/ }),
  ).toBeVisible();
});
test("unknown dashboard routes return 404 and signed-out clients go to sign-in", async ({
  page,
}) => {
  await fixture(page);
  const response = await page.goto("/dashboard/not-a-real-page");
  expect(response?.status()).toBe(404);
  await page.context().clearCookies();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
});
test('registration progresses from account details through OTP and password', async ({ page }) => {
  await fixture(page);
  const actions: string[] = [];
  await page.route('**/api/account/*', async route => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1)!;
    actions.push(action);
    await route.fulfill({ json: { success: true, phone: '08000000000', requiresPasswordSetup: true } });
  });
  await page.goto('/register');
  await page.getByLabel('First name', { exact: true }).fill('Synthetic');
  await page.getByLabel('Last name', { exact: true }).fill('Operator');
  await page.getByLabel('Work email', { exact: true }).fill('synthetic@example.test');
  await page.getByLabel('Mobile number', { exact: true }).fill('08000000000');
  await page.getByRole('checkbox').check();
  await accessible(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Verification');
  await page.getByLabel('Registration code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify and continue', exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText('Password');
  await page.getByLabel('Password', { exact: true }).fill('SyntheticPassword123!');
  await page.getByLabel('Confirm password', { exact: true }).fill('SyntheticPassword123!');
  await page.getByRole('button', { name: 'Open your workspace', exact: true }).click();
  await expect(page).toHaveURL(/dashboard\/setup/);
  expect(actions).toEqual(['register', 'verify-registration', 'set-password']);
  expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toMatch(/SyntheticPassword|123456|synthetic@example/);
});
test('invitation removes the URL secret and requires work email before acceptance', async ({ page }) => {
  await fixture(page);
  const ticket = 's'.repeat(43);
  let saved = false;
  await page.route('**/api/invitations/pending', async route => {
    if (route.request().method() === 'POST') { expect(route.request().postDataJSON().token).toBe(ticket); saved = true; }
    await route.fulfill({ json: { pending: saved, success: true } });
  });
  await page.route('**/api/client/me', route => route.fulfill({ json: { success: true, data: { user: { ...user, emailVerified: false }, workspaces: [workspace] } } }));
  await page.route('**/api/client/email/*', route => route.fulfill({ json: { success: true, data: { verified: true, sent: true } } }));
  await page.route('**/api/client/invitations/accept', async route => {
    expect(route.request().postDataJSON()).toEqual({});
    await route.fulfill({ json: { success: true, data: { workspaceId } } });
  });
  await page.goto('/join#token=' + ticket);
  await expect(page.getByRole('button', { name: 'Send work-email code' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await expect(page.getByRole('button', { name: 'Accept workspace invitation' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Send work-email code' }).click();
  await page.getByLabel('Email code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Verify work email', exact: true }).click();
  await page.getByRole('button', { name: 'Accept workspace invitation' }).click();
  await expect(page).toHaveURL(/dashboard\?workspace=/);
  expect(await page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage))).not.toContain(ticket);
});
