import { cookies } from "next/headers";
import { z } from "zod";
import {
  failure,
  guard,
  names,
  PortalError,
  readBody,
  reply,
} from "@/lib/server";
export async function GET() {
  return reply({
    pending: Boolean((await cookies()).get(names.invitation)?.value),
  });
}
export async function POST(request: Request) {
  try {
    await guard(request);
    const input = z
      .object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
      .strict()
      .safeParse(await readBody(request, 1024));
    if (!input.success)
      throw new PortalError(422, "Invalid workspace invitation.");
    (await cookies()).set(names.invitation, input.data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 900,
    });
    return reply({ pending: true });
  } catch (error) {
    return failure(error);
  }
}
