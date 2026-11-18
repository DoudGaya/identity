import { z } from "zod";

export const sessionSchema = z.object({
  id: z.string(),
  policyCode: z.enum(["CONSUMER_VA_P0", "AGENT_P0", "BUSINESS_P0", "PARTNER_PERSONAL_P0", "PARTNER_BUSINESS_P0"]),
  state: z.string(),
  status: z.enum([
    "NOT_STARTED",
    "CONSENT_REQUIRED",
    "IN_PROGRESS",
    "ACTION_REQUIRED",
    "REVIEW_REQUIRED",
    "VERIFIED",
    "REJECTED",
    "EXPIRED",
    "REVOKED",
    "LEGACY_UNVERIFIED",
  ]),
  nextAction: z.string(),
  reasonCodes: z.array(z.string()),
  expiresAt: z.string(),
  updatedAt: z.string(),
});
export const evidenceSchema = z.object({
  id: z.string(),
  addressType: z.string(),
  documentType: z.string(),
  uploadStatus: z.enum(["INITIATED", "UPLOADED", "FAILED"]),
  scanStatus: z.enum(["PENDING", "CLEAN", "REJECTED", "INFECTED", "FAILED"]),
  uploadedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
});
const dataSchema = z.object({
  partner:z.object({verificationId:z.string().uuid(),workspaceName:z.string(),privacyUrl:z.string().url()}).optional(),
  biometricCapture: z.object({
    jobId: z.string().uuid(), token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    direction: z.enum(["LEFT", "RIGHT"]), expiresAt: z.string().datetime(),
  }).optional(),
  businessEvidence: z
    .object({
      id: z.string(),
      documentType: z.string(),
      uploadStatus: z.string(),
      scanStatus: z.string(),
    })
    .optional(),
  businessDocuments: z
    .array(
      z.object({
        id: z.string(),
        evidenceType: z.string(),
        uploadStatus: z.string(),
        scanStatus: z.string(),
        uploadedAt: z.string().nullable(),
      }),
    )
    .optional(),
  capture: z
    .object({
      jobId: z.string(),
      token: z.string(),
      product: z.enum(["biometric_kyc", "doc_verification"]),
      environment: z.literal("production"),
      callback_url: z.string().url(),
      partner_params: z.record(z.string(), z.string()),
      partner_details: z.object({
        partner_id: z.string(),
        name: z.string(),
        logo_url: z.string().url(),
        policy_url: z.string().url(),
        theme_color: z.string(),
      }),
    })
    .optional(),
  session: sessionSchema.optional(),
  evidence: evidenceSchema.optional(),
  consentReceiptId: z.string().optional(),
  addressType: z.string().optional(),
  status: z.string().optional(),
  nextAction: z.string().optional(),
  upload: z
    .object({
      uploadUrl: z.string().url(),
      method: z.literal("PUT"),
      expiresAt: z.string(),
      requiredHeaders: z.record(z.string(), z.string()),
    })
    .optional(),
});
export const envelopeSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    data: dataSchema,
    correlationId: z.string(),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    }),
    correlationId: z.string(),
  }),
]);
export type Session = z.infer<typeof sessionSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type IdentityData = z.infer<typeof dataSchema>;
export type Mode = "preview" | "staging" | "live" | "off";
export const documentTypes = [
  "UTILITY_BILL",
  "BANK_STATEMENT",
  "TAX_ASSESSMENT",
  "PUBLIC_AUTHORITY_LETTER",
] as const;
export type DocumentType = (typeof documentTypes)[number];
export const documentNames: Record<DocumentType, string> = {
  UTILITY_BILL: "Utility bill",
  BANK_STATEMENT: "Bank statement",
  TAX_ASSESSMENT: "Tax assessment",
  PUBLIC_AUTHORITY_LETTER: "Public authority letter",
};
export type LocationPoint = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
};
export type Address = {
  line1: string;
  locality: string;
  lga: string;
  state: string;
  countryCode: "NG";
};

export function validateDocument(
  file: Pick<File, "type" | "size">,
  issuedAt: string,
  now = new Date(),
): string | null {
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type))
    return "Choose a PDF, JPG or PNG document.";
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    return "Choose a document between 1 byte and 10 MB.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedAt))
    return "Enter the date printed on your document.";
  const date = new Date(`${issuedAt}T00:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== issuedAt
  )
    return "Enter a valid document date.";
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  const days = (today.getTime() - date.getTime()) / 86400000;
  if (days < 0) return "The document date cannot be in the future.";
  if (days > 90) return "Choose a document issued within the last 90 days.";
  return null;
}

export function displayStatus(session: Session, evidence: Evidence | null) {
  if (session.status === "REJECTED" || session.status === "REVOKED")
    return {
      title: "We couldn’t complete verification",
      detail:
        "Please contact Nillar support through your Nillar app to review the outcome.",
      tone: "error",
    };
  if (session.status === "EXPIRED")
    return {
      title: "This session has expired",
      detail: "Start a new verification session to continue.",
      tone: "warning",
    };
  if (
    evidence &&
    ["REJECTED", "INFECTED", "FAILED"].includes(evidence.scanStatus)
  )
    return {
      title: "Your document needs attention",
      detail:
        "The document could not pass the upload checks. Submit a different document through a new session.",
      tone: "warning",
    };
  if (session.status === "ACTION_REQUIRED")
    return {
      title: "A little more information is needed",
      detail:
        "Please follow up through Nillar support. Your identity may need an additional consent or correction step.",
      tone: "warning",
    };
  if (session.status === "VERIFIED")
    return {
      title: "Identity verification complete",
      detail: "Your required verification checks have passed.",
      tone: "success",
    };
  return {
    title: "Your verification is in progress",
    detail:
      "Your information has been submitted. You can check for an update below.",
    tone: "neutral",
  };
}
