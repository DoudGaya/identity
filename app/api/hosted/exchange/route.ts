import { cookies } from "next/headers";
import { portalMode, webOrigin } from "@/lib/config";
import {
  failure,
  names,
  PortalError,
  readBody,
  reply,
  upstream,
  issueCsrf,
} from "@/lib/server";

export async function POST(request: Request) {
  try {
    if (!["staging", "live"].includes(portalMode()))
      throw new PortalError(503, "Verification is not enabled.");
    if (
      request.headers.get("origin") !== webOrigin() ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      throw new PortalError(403, "Invalid request origin.");
    const input = (await readBody(request)) as { ticket?: unknown };
    if (
      typeof input.ticket !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(input.ticket)
    )
      throw new PortalError(400, "Invalid verification link.");
    const response = await upstream(
      "/api/v1/identity/hosted-sessions/exchange",
      { ticket: input.ticket },
    );
    const result = await response.json();
    if (!response.ok || result.success !== true)
      throw new PortalError(
        response.status,
        "This verification link has expired or was already used. Return to your app to start again.",
      );
    const data = result.data;
    if (
      typeof data.accessToken !== "string" ||
      !data.accessToken.startsWith("nihs.") ||
      typeof data.sessionId !== "string"
    )
      throw new PortalError(502, "Unexpected verification response.");
    const jar = await cookies();
    jar.set(names.access, data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 900,
    });
    jar.delete(names.refresh);
    const csrf = await issueCsrf();
    // The scoped access token stays in an HttpOnly cookie.
    return reply({
      sessionId: data.sessionId,
      returnUri: data.returnUri,
      state: data.state,
      csrf,
    });
  } catch (error) {
    return failure(error);
  }
}
