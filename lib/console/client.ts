"use client";
import { csrf, refresh, ClientError } from "@/lib/client";
type Options = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  key?: string;
  signal?: AbortSignal;
};
export async function consoleRequest<T>(
  path: string,
  options: Options = {},
  retried = false,
): Promise<T> {
  const method = options.method || "GET",
    headers: Record<string, string> = {};
  if (method !== "GET") {
    headers["content-type"] = "application/json";
    headers["x-csrf-token"] = await csrf();
  }
  if (options.key) headers["idempotency-key"] = options.key;
  const response = await fetch(`/api/client/${path}`, {
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    signal: options.signal,
    body: method === "GET" ? undefined : JSON.stringify(options.body || {}),
  });
  if (response.status === 401 && !retried) {
    await refresh();
    return consoleRequest(path, options, true);
  }
  const result = await response.json();
  if (!response.ok || result.success !== true)
    throw new ClientError(
      result.error?.message ||
        "We couldn’t complete this request. Please try again.",
      response.status,
      result.correlationId,
    );
  return result.data as T;
}
