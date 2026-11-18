import { cookies } from "next/headers";
import { portalMode, webOrigin } from "@/lib/config";
import {
  guard,
  failure,
  issueCsrf,
  names,
  PortalError,
  readBody,
  reply,
  upstream,
} from "@/lib/server";
export async function handle(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await context.params;
    if (!["exchange", "status", "simulate"].includes(action))
      throw new PortalError(404, "Route unavailable.");
    if (action === "exchange") {
      if (request.method !== "POST") throw new PortalError(405, "Use POST.");
      if (!["staging", "live"].includes(portalMode()))
        throw new PortalError(503, "Hosted verification is unavailable.");
      if (
        request.headers.get("origin") !== webOrigin() ||
        request.headers.get("sec-fetch-site") === "cross-site"
      )
        throw new PortalError(403, "Invalid request origin.");
    } else await guard(request);
    if (
      (action === "status" && request.method !== "GET") ||
      (action === "simulate" && request.method !== "POST")
    )
      throw new PortalError(405, "Method unavailable.");
    const jar = await cookies(),
      token = jar.get(names.capture)?.value;
    if (action !== "exchange" && !token)
      throw new PortalError(
        401,
        "Open your verification link again or ask the sender for a new one.",
      );
    const body =
      request.method === "GET" ? undefined : await readBody(request, 8192);
    const response = await upstream(
        `/api/v1/identity/partner-hosted/${action}`,
        body,
        action === "exchange" ? undefined : token,
      ),
      result = await response.json();
    if (!response.ok || result.success !== true)
      throw new PortalError(
        response.status,
        result.error?.message || "This verification session is unavailable.",
      );
    const data = result.data;
    if (action === "exchange") {
      if (
        typeof data.accessToken !== "string" ||
        !data.accessToken.startsWith("niphs.") ||
        typeof data.sessionId !== "string" ||
        !data.verification
      )
        throw new PortalError(502, "Unexpected hosted response.");
      const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: 900,
      };
      jar.set(names.capture, data.accessToken, options);
      jar.set(names.captureId, data.sessionId, options);
      const csrf = await issueCsrf();
      return reply({
        success: true,
        data: {
          verification: data.verification,
          sessionId: data.sessionId,
          workspaceName: data.workspaceName,
          privacyUrl: data.privacyUrl,
          returnUri: data.returnUri,
          state: data.state,
          csrf,
        },
      });
    }
    return reply({ success: true, data });
  } catch (error) {
    return failure(error);
  }
}
export { handle as GET, handle as POST };
