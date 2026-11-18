import "server-only";
export function portalMode(): "preview" | "staging" | "live" | "off" {
  const mode = process.env.IDENTITY_PORTAL_MODE ?? "off";
  if (process.env.NODE_ENV === "production" && mode === "preview") return "off";
  return mode === "preview" || mode === "staging" || mode === "live"
    ? mode
    : "off";
}
export function webOrigin() {
  const value = new URL(
    process.env.IDENTITY_WEB_ORIGIN ?? "http://127.0.0.1:3002",
  );
  if (
    process.env.NODE_ENV === "production" &&
    value.protocol !== "https:" &&
    ["staging", "live"].includes(process.env.IDENTITY_PORTAL_MODE || "")
  )
    throw new Error("HTTPS origin required");
  return value.origin;
}
export function backendOrigin() {
  const url = new URL(
    process.env.IDENTITY_BACKEND_URL ?? "http://127.0.0.1:3000",
  );
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid backend origin");
  if (
    url.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.protocol === "http:"
    )
  )
    throw new Error("Secure backend origin required");
  return url.origin;
}
