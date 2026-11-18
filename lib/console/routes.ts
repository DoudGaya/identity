export const dashboardRoutes: Record<string, { page: string; title: string }> =
  {
    "": { page: "overview", title: "Overview" },
    setup: { page: "setup", title: "Get started" },
    verifications: { page: "verifications", title: "Verifications" },
    "verifications/new": {
      page: "new-verification",
      title: "New verification",
    },
    customers: { page: "customers", title: "Customers" },
    activity: { page: "activity", title: "Workspace activity" },
    usage: { page: "usage", title: "Usage" },
    billing: { page: "billing", title: "Billing" },
    "developers/keys": { page: "keys", title: "API keys" },
    "developers/webhooks": { page: "webhooks", title: "Webhooks" },
    "developers/deliveries": {
      page: "deliveries",
      title: "Webhook deliveries",
    },
    "developers/requests": { page: "requests", title: "API requests" },
    "developers/playground": {
      page: "playground",
      title: "Sandbox playground",
    },
    settings: { page: "settings", title: "Workspace settings" },
    "settings/team": { page: "team", title: "Team" },
    "settings/security": { page: "security", title: "Security" },
    "settings/verification": {
      page: "verification-settings",
      title: "Verification settings",
    },
    compliance: { page: "compliance", title: "Go live" },
    support: { page: "support", title: "Help & support" },
  };
export function dashboardRoute(parts: string[] = []) {
  const path = parts.join("/");
  if (dashboardRoutes[path]) return dashboardRoutes[path];
  const match =
    /^(verifications|customers|developers\/webhooks)\/([a-f0-9-]{36})$/i.exec(
      path,
    );
  if (!match) return null;
  return {
    page:
      match[1] === "verifications"
        ? "verification-detail"
        : match[1] === "customers"
          ? "customer-detail"
          : "webhook-detail",
    title:
      match[1] === "verifications"
        ? "Verification detail"
        : match[1] === "customers"
          ? "Customer detail"
          : "Webhook detail",
    recordId: match[2],
  };
}
