import { beforeEach, describe, expect, it, vi } from "vitest";
const { jar, set, remove } = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  set: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { value: jar.get(name) } : undefined,
    set,
    delete: remove,
  }),
}));
import { GET, POST } from "@/app/api/client/[...path]/route";
import { POST as accountPost } from "@/app/api/account/[action]/route";
import { POST as hostedPost } from "@/app/api/client-hosted/[action]/route";
import { POST as capturePost } from "@/app/api/identity/[...path]/route";
import { safeConsoleData } from "./response";
const origin = "http://127.0.0.1:3002",
  csrf = "a".repeat(64),
  workspace = "workspace_123",
  id = "12345678-1234-1234-1234-123456789abc";
const context = (path: string) => ({
  params: Promise.resolve({ path: path.split("/") }),
});
const request = (path: string, body: unknown = {}, source = origin) =>
  new Request(origin + path, {
    method: "POST",
    headers: {
      origin: source,
      "content-type": "application/json",
      "x-csrf-token": csrf,
    },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("IDENTITY_PORTAL_MODE", "staging");
  vi.stubEnv("IDENTITY_WEB_ORIGIN", origin);
  vi.stubEnv("IDENTITY_BACKEND_URL", "http://127.0.0.1:3000");
  jar.clear();
  jar.set("nillar_identity_csrf", csrf);
  set.mockReset();
  remove.mockReset();
});
describe("client gateway authentication and privacy", () => {
  it("does not forward financial routes, browser bearer headers or user claims", async () => {
    jar.set("nillar_identity_access", "cookie-session");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ success: true, data: { user: { id: "user" } } }),
      );
    vi.stubGlobal("fetch", fetch);
    const blocked = await POST(
      request("/api/client/banking/transfers"),
      context("banking/transfers"),
    );
    expect(blocked.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    await GET(
      new Request(origin + "/api/client/me", {
        headers: {
          authorization: "Bearer browser-injected",
          "x-user-id": "someone-else",
        },
      }),
      context("me"),
    );
    expect(fetch.mock.calls[0][1].headers.authorization).toBe(
      "Bearer cookie-session",
    );
    expect(fetch.mock.calls[0][1].headers["x-user-id"]).toBeUndefined();
  });
  it("rejects cross-site writes and hosted credentials before contacting the backend", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    jar.set("nillar_identity_access", "cookie-session");
    expect(
      (
        await POST(
          request("/api/client/workspaces", {}, "https://evil.test"),
          context("workspaces"),
        )
      ).status,
    ).toBe(403);
    jar.set("nillar_identity_access", "niphs.scoped-credential");
    expect(
      (await GET(new Request(origin + "/api/client/me"), context("me"))).status,
    ).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retains one-time integration secrets only on authorised creation responses", async () => {
    jar.set("nillar_identity_access", "cookie-session");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(async () =>
          Response.json({
            success: true,
            data: {
              items: [
                {
                  name: "safe",
                  secretHash: "never-browser",
                  secret: "never-list",
                },
              ],
              accessToken: "never-browser",
              secret: "shown-once",
            },
          }),
        ),
    );
    const list = await GET(
      new Request(origin + `/api/client/workspaces/${workspace}/keys`),
      context(`workspaces/${workspace}/keys`),
    );
    expect(JSON.stringify(await list.json())).not.toMatch(
      /never-browser|never-list|shown-once/,
    );
    const create = await POST(
      request(`/api/client/workspaces/${workspace}/keys`, {}),
      context(`workspaces/${workspace}/keys`),
    );
    const data = await create.json();
    expect(data.data.secret).toBe("shown-once");
    expect(data.data.accessToken).toBeUndefined();
  });
  it("keeps signup credentials and identity attributes out of browser JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            success: true,
            accessToken: "access-server-only",
            refreshToken: "refresh-server-only",
            user: {
              id: "fixture-user",
              nin: "sensitive-identifier",
              twoFactorSecret: "sensitive-mfa",
            },
            requiresPasswordSetup: true,
          }),
        ),
    );
    const response = await accountPost(
      request("/api/account/verify-registration", {
        email: "person@example.test",
        phone: "08000000000",
        firstName: "Test",
        lastName: "Person",
        code: "123456",
      }),
      { params: Promise.resolve({ action: "verify-registration" }) },
    );
    expect(await response.json()).toEqual({
      success: true,
      requiresPasswordSetup: true,
    });
    expect(set).toHaveBeenCalledWith(
      "nillar_identity_access",
      "access-server-only",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(set).toHaveBeenCalledWith(
      "nillar_identity_registration_user",
      "fixture-user",
      expect.objectContaining({ httpOnly: true }),
    );
  });
  it("takes password setup ownership only from the server-issued registration cookie", async () => {
    jar.set("nillar_identity_access", "session");
    jar.set("nillar_identity_registration_user", "owner-from-cookie");
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);
    const response = await accountPost(
      request("/api/account/set-password", { password: "ValidPassword123!" }),
      { params: Promise.resolve({ action: "set-password" }) },
    );
    expect(response.status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body).userId).toBe(
      "owner-from-cookie",
    );
    expect(
      (
        await accountPost(
          request("/api/account/set-password", {
            password: "ValidPassword123!",
            userId: "injected",
          }),
          { params: Promise.resolve({ action: "set-password" }) },
        )
      ).status,
    ).toBe(422);
  });
  it("stores partner capture access separately from the operator login", async () => {
    jar.set("nillar_identity_access", "operator-session");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            success: true,
            data: {
              accessToken: "niphs.capture",
              sessionId: id,
              verification: { id, environment: "SANDBOX" },
              workspaceName: "Example organisation",
              returnUri: "",
              state: "",
            },
          }),
        ),
    );
    const response = await hostedPost(
      request("/api/client-hosted/exchange", { ticket: "fixture-ticket" }),
      { params: Promise.resolve({ action: "exchange" }) },
    );
    expect(response.status).toBe(200);
    expect(JSON.stringify(await response.json())).not.toContain(
      "niphs.capture",
    );
    expect(set).toHaveBeenCalledWith(
      "nillar_identity_capture",
      "niphs.capture",
      expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
    );
    expect(set).not.toHaveBeenCalledWith(
      "nillar_identity_access",
      expect.anything(),
      expect.anything(),
    );
  });
  it("sends scoped capture access only to the exact session ID", async () => {
    jar.set("nillar_identity_access", "operator-session");
    jar.set("nillar_identity_capture", "niphs.capture");
    jar.set("nillar_identity_capture_id", id);
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ success: true, data: {}, correlationId: "fixture" }),
      );
    vi.stubGlobal("fetch", fetch);
    await capturePost(
      request(`/api/identity/sessions/${id}/consent`, { accepted: true }),
      context(`sessions/${id}/consent`),
    );
    expect(fetch.mock.calls[0][1].headers.authorization).toBe(
      "Bearer niphs.capture",
    );
    await capturePost(
      request("/api/identity/sessions/other-session-123/consent", {
        accepted: true,
      }),
      context("sessions/other-session-123/consent"),
    );
    expect(fetch.mock.calls[1][1].headers.authorization).toBe(
      "Bearer operator-session",
    );
  });
  it("redeems pending invitations from an HttpOnly cookie and clears it on success", async () => {
    jar.set("nillar_identity_access", "operator-session");
    jar.set("nillar_identity_pending_invitation", "a".repeat(43));
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ success: true, data: { workspaceId: workspace } }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await POST(
      request("/api/client/invitations/accept", {}),
      context("invitations/accept"),
    );
    expect(response.status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body).token).toBe("a".repeat(43));
    expect(remove).toHaveBeenCalledWith("nillar_identity_pending_invitation");
  });
  it("removes private fields recursively without modifying public references", () => {
    expect(
      safeConsoleData({
        reference: "customer_123",
        user: { nin: "private", bvn: "private", passwordHash: "private" },
        encryptedSecret: { ciphertext: "private" },
        items: [{ leaseToken: "private", status: "PENDING" }],
      }),
    ).toEqual({
      reference: "customer_123",
      user: {},
      items: [{ status: "PENDING" }],
    });
  });
});
