const privateFields = new Set([
  "accessToken",
  "refreshToken",
  "token",
  "passwordHash",
  "pinHash",
  "twoFactorSecret",
  "nin",
  "bvn",
  "ciphertext",
  "wrappedDataKey",
  "authenticationTag",
  "nonce",
  "secretHash",
  "ticketHash",
  "encryptedSecret",
  "challengeDigest",
  "corePlatformId",
  "leaseToken",
]);
/** Defence in depth around the console DTOs; raw capture uses a separate gateway. */
export function safeConsoleData(
  value: unknown,
  allowOnceSecret = false,
  depth = 0,
): unknown {
  if (depth > 12) return null;
  if (Array.isArray(value))
    return value.map((item) => safeConsoleData(item, false, depth + 1));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key]) =>
            !privateFields.has(key) &&
            (key !== "secret" || (allowOnceSecret && depth === 0)),
        )
        .map(([key, item]) => [key, safeConsoleData(item, false, depth + 1)]),
    );
  return value;
}
