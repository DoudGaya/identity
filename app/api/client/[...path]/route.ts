import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import {
  guard,
  names,
  readBody,
  reply,
  failure,
  PortalError,
} from "@/lib/server";
import { backendOrigin } from "@/lib/config";
import { allowedConsoleRoute } from "@/lib/console/policy";
import { safeConsoleData } from '@/lib/console/response';
export const runtime = "nodejs";
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    await guard(request);
    const path = (await context.params).path.join("/");
    if (!allowedConsoleRoute(request.method, path))
      throw new PortalError(404, "Route unavailable.");
    const token = (await cookies()).get(names.access)?.value;
    if (!token || token.startsWith("nihs.") || token.startsWith("niphs."))
      throw new PortalError(401, "Sign in to your client account to continue.");
    const url = new URL(request.url),
      query = new URLSearchParams();
    for (const key of [
      "environment",
      "limit",
      "cursor",
      "search",
      "status",
      "days",
    ])
      if (url.searchParams.has(key)) query.set(key, url.searchParams.get(key)!);
    const headers: Record<string, string> = {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-app-source": "nillar-identity-web",
      "x-correlation-id": randomUUID(),
    };
    const idempotency = request.headers.get("idempotency-key");
    if (idempotency) {
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotency))
        throw new PortalError(422, "Invalid request reference.");
      headers["idempotency-key"] = idempotency;
    }
    let body = request.method === "GET" ? undefined : await readBody(request);
    if (
      path === "invitations/accept" &&
      body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      !("token" in body)
    )
      body = { ...body, token: (await cookies()).get(names.invitation)?.value };
    const response = await fetch(
      `${backendOrigin()}/api/v1/identity/console/${path}${query.size ? "?" + query : ""}`,
      {
        method: request.method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      },
    );
    const result = await response.json();
    if (typeof result !== "object" || typeof result.success !== "boolean")
      throw new PortalError(502, "Unexpected client service response.");
    if (path === "invitations/accept" && response.ok && result.success)
      (await cookies()).delete(names.invitation);
    const allowSecret=request.method==='POST'&&(/^workspaces\/[^/]+\/(keys|webhooks)$/.test(path)||/^workspaces\/[^/]+\/webhooks\/[^/]+\/rotate$/.test(path));
    return reply(result.success?{...result,data:safeConsoleData(result.data,allowSecret)}:result, response.status);
  } catch (error) {
    return failure(error);
  }
}
export { handle as GET, handle as POST, handle as PATCH };
