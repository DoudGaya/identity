const id = /^[A-Za-z0-9_-]{8,64}$/;
export function allowedConsoleRoute(method: string, path: string) {
  if (method === "GET" && path === "me") return true;
  if (
    method === "POST" &&
    [
      "workspaces",
      "email/send",
      "email/verify",
      "security/setup",
      "security/enable",
      "invitations/accept",
    ].includes(path)
  )
    return true;
  const parts = path.split("/");
  if (parts[0] !== "workspaces" || !id.test(parts[1] || "") || parts.length > 5)
    return false;
  const resource = parts[2],
    record = parts[3],
    action = parts[4];
  if (parts.length === 3) {
    if (method === "GET")
      return [
        "summary",
        "verifications",
        "customers",
        "keys",
        "webhooks",
        "deliveries",
        "members",
        "settings",
        "activity",
        "requests",
        "usage",
        "policies",
      ].includes(resource);
    if (method === "POST")
      return [
        "verifications",
        "keys",
        "webhooks",
        "invitations",
        "production",
      ].includes(resource);
    return method === "PATCH" && resource === "settings";
  }
  if (!id.test(record || "")) return false;
  if (parts.length === 4)
    return (
      (method === "GET" &&
        ["verifications", "customers", "webhooks", "deliveries"].includes(
          resource,
        )) ||
      (method === "PATCH" && resource === "members")
    );
  if (method !== "POST") return false;
  return (
    (
      {
        verifications: ["cancel", "renew", "simulate"],
        keys: ["revoke"],
        webhooks: ["test", "rotate", "toggle"],
        deliveries: ["retry"],
        invitations: ["revoke"],
      } as Record<string, string[]>
    )[resource]?.includes(action) || false
  );
}
