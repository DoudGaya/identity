import { z } from "zod";
export const roles = [
  "OWNER",
  "ADMIN",
  "DEVELOPER",
  "ANALYST",
  "VIEWER",
] as const;
export type Role = (typeof roles)[number];
export type Environment = "SANDBOX" | "LIVE";
export const workspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  website: z.string().nullable(),
  businessType: z.string(),
  registrationNumber: z.string().nullable(),
  useCase: z.string().nullable(),
  privacyUrl: z.string().nullable(),
  supportEmail: z.string().nullable(),
  returnOrigins: z.array(z.string()),
  retentionDays: z.number(),
  productionStatus: z.string(),
  productionReason: z.string().nullable(),
  productionRequestedAt: z.string().nullable(),
  suspendedAt: z.string().nullable(),
  role: z.enum(roles),
  memberId: z.string(),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export const bootstrapSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    mfa: z.boolean(),
    emailVerified: z.boolean(),
    sessionId: z.string().nullable(),
  }),
  workspaces: z.array(workspaceSchema),
});
export type Bootstrap = z.infer<typeof bootstrapSchema>;
export type Verification = {
  id: string;
  environment: Environment;
  reference: string;
  customerReference?: string;
  policyCode: string;
  status: string;
  reasonCodes: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  completedAt: string | null;
  verifiedAt: string | null;
  assuranceExpiresAt: string | null;
  assuranceLevel: string | null;
  version: number;
};
export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  environment: Environment;
  scopes: string[];
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdById: string;
};
export type Endpoint = {
  id: string;
  description: string;
  url: string;
  events: string[];
  environment: Environment;
  secretVersion: number;
  disabledAt: string | null;
  createdAt: string;
  _count: { deliveries: number };
};
export type Delivery = {
  id: string;
  endpointId: string;
  eventId: string;
  status: string;
  attempts: number;
  responseStatus: number | null;
  lastErrorCode: string | null;
  createdAt: string;
  deliveredAt: string | null;
  event: { type: string };
  endpoint?: { description: string; url: string };
};
export type Customer = {
  id: string;
  reference: string;
  environment: Environment;
  createdAt: string;
  _count?: { verifications: number };
};
export type Audit = {
  id: string;
  actorId: string;
  action: string;
  entityId: string | null;
  createdAt: string;
};
export type ApiLog = {
  id: string;
  correlationId: string;
  method: string;
  operation: string;
  status: number;
  durationMs: number;
  errorCode: string | null;
  createdAt: string;
  apiKeyId: string | null;
};
export type PageResult<T> = { items: T[]; nextCursor: string | null };
export type Summary = {
  counts: { status: string; count: number }[];
  recent: Verification[];
  monthUsage: number;
  customers: number;
  failedDeliveries: number;
  monthlyLimit: number;
  productionStatus: string;
  setup: Record<
    | "email"
    | "profile"
    | "mfa"
    | "apiKey"
    | "webhook"
    | "webhookDelivered"
    | "testVerification",
    boolean
  >;
};
export type Usage = {
  days: number;
  daily: { day: string; total: number; verified: number }[];
  requests: { status: number; count: number }[];
  activeKeys: number;
  billing: { currency: string; status: string; message: string };
};
export const eventTypes = [
  "verification.created",
  "verification.updated",
  "verification.verified",
  "verification.rejected",
  "verification.review_required",
  "verification.expired",
  "verification.cancelled",
  "verification.revoked",
  "webhook.test",
];
export function may(
  role: Role,
  action: "verify" | "develop" | "manage" | "owner",
) {
  const permissions = {
    verify: ["OWNER", "ADMIN", "DEVELOPER", "ANALYST"],
    develop: ["OWNER", "ADMIN", "DEVELOPER"],
    manage: ["OWNER", "ADMIN"],
    owner: ["OWNER"],
  };
  return permissions[action].includes(role);
}
export function safeCsv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          let value = String(cell ?? "");
          if (/^[=+@\-\t\r]/.test(value)) value = "'" + value;
          return '"' + value.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
