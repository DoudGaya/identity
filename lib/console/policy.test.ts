import { describe, expect, it } from "vitest";
import { allowedConsoleRoute } from "./policy";
import { dashboardRoute, dashboardRoutes } from "./routes";
import { safeCsv } from "./contracts";
describe("client route and export boundaries", () => {
  const workspace = "workspace_123",
    id = "12345678-1234-1234-1234-123456789abc";
  it("allows only the implemented console resources", () => {
    expect(allowedConsoleRoute("GET", "me")).toBe(true);
    expect(
      allowedConsoleRoute("POST", `workspaces/${workspace}/verifications`),
    ).toBe(true);
    expect(
      allowedConsoleRoute("POST", `workspaces/${workspace}/keys/${id}/revoke`),
    ).toBe(true);
    expect(
      allowedConsoleRoute("GET", `workspaces/${workspace}/customers/${id}`),
    ).toBe(true);
  });
  it.each([
    "banking/transfers",
    "wallet",
    "users",
    "workspaces/../../banking",
    "workspaces/workspace_123/evidence",
    "workspaces/workspace_123/keys/key_12345/reveal",
    "workspaces/workspace_123/verifications/../../secrets",
  ])("denies gateway escape %s", (path) => {
    expect(allowedConsoleRoute("POST", path)).toBe(false);
    expect(allowedConsoleRoute("GET", path)).toBe(false);
  });
  it("does not turn unknown dashboard addresses into a support page", () => {
    for (const path of Object.keys(dashboardRoutes))
      expect(dashboardRoute(path ? path.split("/") : [])?.title).toBeTruthy();
    expect(dashboardRoute(["developers", "webhooks", id])?.page).toBe(
      "webhook-detail",
    );
    expect(dashboardRoute(["unknown", "path"])).toBeNull();
    expect(dashboardRoute(["verifications", "../../outside"])).toBeNull();
  });
  it("neutralises spreadsheet formulas while preserving ordinary opaque references", () => {
    const csv = safeCsv([
      ["Reference", "Status"],
      ['=IMPORTXML("https://example.test")', "VERIFIED"],
      ["@command", "REJECTED"],
      ["customer_123", "CREATED"],
    ]);
    expect(csv).toContain("\"'=IMPORTXML");
    expect(csv).toContain('"\'@command"');
    expect(csv).toContain('"customer_123","CREATED"');
  });
});
