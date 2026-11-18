import { cookies } from "next/headers";
import { z } from "zod";
import { backendOrigin } from "@/lib/config";
import {
  clearTokens,
  failure,
  guard,
  names,
  PortalError,
  readBody,
  reply,
  setTokens,
  upstream,
} from "@/lib/server";
const email = z.string().trim().email().max(254),
  phone = z
    .string()
    .min(10)
    .max(25)
    .regex(/^\+?[\d\s-]+$/),
  code = z.string().regex(/^\d{6}$/),
  password = z
    .string()
    .min(12)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/);
const schemas = {
  register: z
    .object({
      email,
      phone,
      firstName: z.string().trim().min(2).max(80),
      lastName: z.string().trim().min(2).max(80),
      acceptTerms: z.literal(true),
      turnstileToken: z.string().max(4096).optional(),
    })
    .strict(),
  "verify-registration": z
    .object({
      email,
      phone,
      code,
      firstName: z.string().trim().min(2).max(80),
      lastName: z.string().trim().min(2).max(80),
    })
    .strict(),
  "resend-registration": z.object({ email, phone }).strict(),
  "set-password": z.object({ password }).strict(),
  "forgot-password": z.object({ email }).strict(),
  "reset-password": z
    .object({ email, otp: code, newPassword: password })
    .strict(),
  "revoke-session": z.discriminatedUnion("scope", [
    z
      .object({ scope: z.literal("ONE"), sessionId: z.string().uuid() })
      .strict(),
    z.object({ scope: z.literal("ALL") }).strict(),
  ]),
};
export async function GET(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    await guard(request);
    if ((await context.params).action !== "sessions")
      throw new PortalError(404, "Route unavailable.");
    const token = (await cookies()).get(names.access)?.value;
    if (!token || token.startsWith("nihs.") || token.startsWith("niphs."))
      throw new PortalError(401, "Sign in again.");
    const response = await upstream("/api/auth/sessions", undefined, token),
      result = await response.json();
    if (!response.ok)
      throw new PortalError(
        response.status,
        "Unable to retrieve account sessions.",
      );
    return reply({
      success: true,
      data: { sessions: result.data?.sessions || [] },
    });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    await guard(request);
    const { action } = await context.params;
    if (!(action in schemas)) throw new PortalError(404, "Route unavailable.");
    const parsed = schemas[action as keyof typeof schemas].safeParse(
      await readBody(request, 8192),
    );
    if (!parsed.success)
      throw new PortalError(
        422,
        "Check your details. Passwords need at least 12 characters, an uppercase letter, a lowercase letter and a number.",
      );
    const input = parsed.data,
      jar = await cookies(),
      token = jar.get(names.access)?.value;
    if (action === "revoke-session") {
      if (!token || token.startsWith("nihs.") || token.startsWith("niphs."))
        throw new PortalError(401, "Sign in again.");
      const response = await fetch(`${backendOrigin()}/api/auth/sessions`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok)
        throw new PortalError(
          response.status,
          "Unable to revoke the selected session.",
        );
      if ("scope" in input && input.scope === "ALL") await clearTokens();
      return reply({ success: true });
    }
    if (action === "set-password") {
      const userId = jar.get(names.registration)?.value;
      if (!userId || !token)
        throw new PortalError(401, "Verify your registration code first.");
      const response = await upstream(
        "/api/auth/set-password",
        { userId, ...input },
        token,
      );
      if (!response.ok)
        throw new PortalError(
          response.status,
          "We couldn’t save your password. Please try again.",
        );
      jar.delete(names.registration);
      return reply({ success: true });
    }
    const upstreamAction =
      action === "verify-registration"
        ? "verify-otp"
        : action === "resend-registration"
          ? "resend-otp"
          : action;
    const body =
      action === "register"
        ? Object.fromEntries(
            Object.entries(input).filter(([key]) => key !== "acceptTerms"),
          )
        : action === "verify-registration" || action === "resend-registration"
          ? { ...input, type: "REGISTER" }
          : input;
    const response = await upstream(`/api/auth/${upstreamAction}`, body),
      result = await response.json();
    if (action === "forgot-password" && response.ok)
      return reply({
        success: true,
        message:
          "If the account exists, a reset code will be sent to its registered contact.",
      });
    if (!response.ok || result.success === false)
      throw new PortalError(
        response.status === 429 ? 429 : response.ok ? 422 : response.status,
        response.status === 429
          ? "Too many attempts. Please wait and try again later."
          : action === "register"
            ? "Registration could not be completed. Check the details, or sign in if you already have a Nillar account."
            : action === "verify-registration"
              ? "That registration code is invalid or expired. Request another code."
              : "We couldn’t complete this account request. Check your details and try again.",
      );
    if (action === "verify-registration") {
      if (
        typeof result.accessToken !== "string" ||
        typeof result.refreshToken !== "string" ||
        typeof result.user?.id !== "string"
      )
        throw new PortalError(502, "Unexpected account response.");
      await setTokens(result.accessToken, result.refreshToken);
      jar.set(names.registration, result.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 900,
      });
      return reply({
        success: true,
        requiresPasswordSetup: result.requiresPasswordSetup !== false,
      });
    }
    if (action === "register")
      return reply({
        success: true,
        phone:
          typeof result.data?.phone === "string"
            ? result.data.phone
            : "phone" in input
              ? input.phone
              : undefined,
        requiresVerification: true,
      });
    if (action === "reset-password") await clearTokens();
    return reply({ success: true });
  } catch (error) {
    return failure(error);
  }
}
