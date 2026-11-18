"use client";
import { csrf, ClientError } from "@/lib/client";
export async function accountRequest<T = Record<string, unknown>>(
  action: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/account/${action}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers:
      body === undefined
        ? {}
        : { "content-type": "application/json", "x-csrf-token": await csrf() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || result.success !== true)
    throw new ClientError(
      result.error?.message || "Unable to complete this request.",
      response.status,
    );
  return result as T;
}
