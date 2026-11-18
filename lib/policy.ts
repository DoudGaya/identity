export const idPattern = /^[A-Za-z0-9_-]{8,64}$/;
export function allowedRoute(method: string, path: string): boolean {
  if (method === "POST" && path === "sessions") return true;
  const parts = path.split("/");
  if (parts[0] !== "sessions" || !idPattern.test(parts[1] ?? "")) return false;
  if (parts.length === 2) return method === "GET";
  if (parts.length === 3 && parts[2] === "business-documents")
    return method === "GET" || method === "POST";
  if (
    parts.length === 3 &&
    [
      "consent",
      "attributes",
      "addresses",
      "evidence",
      "submit",
      "business",
      "capture",
      "screening",
      "biometrics",
    ].includes(parts[2])
  )
    return method === "POST";
  if (parts[2] !== "evidence" || !/^[a-f0-9-]{36}$/i.test(parts[3] ?? ""))
    return false;
  return (
    (parts.length === 4 && method === "GET") ||
    (parts.length === 5 && parts[4] === "complete" && method === "POST")
  );
}

export function validMutation(
  request: Request,
  expectedOrigin: string,
  cookieToken?: string,
): boolean {
  if (
    request.headers.get("origin") !== expectedOrigin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return false;
  const token = request.headers.get("x-csrf-token");
  return Boolean(
    cookieToken && /^[a-f0-9]{64}$/.test(cookieToken) && token === cookieToken,
  );
}

export function uploadAllowed(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.origin === origin &&
      !parsed.username &&
      !parsed.password &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}
