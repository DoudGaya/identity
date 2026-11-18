const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const response = (schema: unknown) => ({
  description: "Successful response",
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["success", "data", "correlationId"],
        properties: {
          success: { const: true },
          data: schema,
          correlationId: { type: "string" },
        },
      },
    },
  },
});
const errors = Object.fromEntries(
  [401, 403, 404, 409, 422, 429, 503].map((status) => [
    String(status),
    {
      description: (
        {
          401: "Invalid or expired credential",
          403: "Scope, role or activation restriction",
          404: "Resource not available in this workspace and environment",
          409: "Conflict with current state or idempotency key",
          422: "Invalid request fields",
          429: "Rate or capacity limit",
          503: "Service not activated or unavailable",
        } as Record<number, string>
      )[status],
      content: { "application/json": { schema: ref("Error") } },
    },
  ]),
);
const id = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" },
};
export const partnerOpenApi = {
  openapi: "3.1.0",
  info: {
    title: "Nillar Identity Partner API",
    version: "1.0.0",
    description:
      "Hosted personal and business verification. API credentials and environments are workspace-scoped. Identity numbers, documents and biometrics are not returned by this API.",
  },
  servers: [{ url: "https://pay.nillar.com/api/v1/identity/partner" }],
  security: [{ PartnerKey: [] }],
  tags: [{ name: "Verifications" }],
  paths: {
    "/verifications": {
      post: {
        tags: ["Verifications"],
        operationId: "createVerification",
        summary: "Create a hosted verification",
        description:
          "Requires verifications:write. Preserve the idempotency key for retries. A launch URL contains a one-time ticket and expires with the 30-minute session.",
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: { type: "string", pattern: "^[A-Za-z0-9._:-]{8,128}$" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: ref("CreateVerification") },
          },
        },
        responses: {
          "201": response({
            type: "object",
            properties: {
              verification: ref("Verification"),
              launchUrl: { type: "string", format: "uri" },
              created: { const: true },
            },
          }),
          "200": response({
            type: "object",
            properties: {
              verification: ref("Verification"),
              launchUrl: { type: "string", format: "uri" },
              created: { const: false },
            },
          }),
          ...errors,
        },
      },
      get: {
        tags: ["Verifications"],
        operationId: "listVerifications",
        summary: "List verifications",
        description:
          "Requires verifications:read. Only the credential’s workspace and environment are queried.",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 25 },
          },
          {
            name: "cursor",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          { name: "status", in: "query", schema: { type: "string" } },
          {
            name: "search",
            in: "query",
            schema: { type: "string", maxLength: 80 },
          },
        ],
        responses: {
          "200": response({
            type: "object",
            properties: {
              items: { type: "array", items: ref("Verification") },
              nextCursor: { type: ["string", "null"] },
            },
          }),
          ...errors,
        },
      },
    },
    "/verifications/{id}": {
      get: {
        tags: ["Verifications"],
        operationId: "getVerification",
        summary: "Retrieve a verification",
        parameters: [id],
        responses: {
          "200": response({
            type: "object",
            properties: { verification: ref("Verification") },
          }),
          ...errors,
        },
      },
    },
    "/verifications/{id}/cancel": {
      post: {
        tags: ["Verifications"],
        operationId: "cancelVerification",
        summary: "Cancel an unfinished verification",
        parameters: [id],
        responses: {
          "200": response({
            type: "object",
            properties: { verification: ref("Verification") },
          }),
          ...errors,
        },
      },
    },
    "/verifications/{id}/renew": {
      post: {
        tags: ["Verifications"],
        operationId: "renewVerificationLink",
        summary: "Regenerate a hosted access link",
        description:
          "Invalidates the previous access credential. Does not extend the session expiry.",
        parameters: [id],
        responses: {
          "200": response({
            type: "object",
            properties: {
              launchUrl: { type: "string", format: "uri" },
              expiresAt: { type: "string", format: "date-time" },
            },
          }),
          ...errors,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      PartnerKey: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "Nillar API key",
        description:
          "ni_test_ for sandbox; ni_live_ for activated production. Keep the key on your server.",
      },
    },
    schemas: {
      CreateVerification: {
        type: "object",
        additionalProperties: false,
        required: ["customerReference", "reference"],
        properties: {
          customerReference: {
            type: "string",
            pattern: "^[A-Za-z0-9_-]{3,80}$",
            description:
              "Opaque customer ID. Do not use an identity number, phone number or name.",
          },
          reference: { type: "string", pattern: "^[A-Za-z0-9_-]{3,80}$" },
          policyCode: {
            type: "string",
            enum: ["CONSUMER_VA_P0", "BUSINESS_P0"],
            default: "CONSUMER_VA_P0",
            description:
              "Personal or business profile. Partner checks use separate Identity-only policies internally. Live business services require separate activation.",
          },
          environment: {
            type: "string",
            enum: ["SANDBOX", "LIVE"],
            description: "If supplied, must match the key environment.",
          },
          returnUrl: {
            type: "string",
            format: "uri",
            description:
              "An HTTPS URL whose exact origin is registered in workspace settings.",
          },
          state: {
            type: "string",
            pattern: "^[A-Za-z0-9_-]{32,128}$",
            description:
              "Required with returnUrl. Generate randomly and verify on return.",
          },
        },
      },
      Verification: {
        type: "object",
        required: [
          "id",
          "environment",
          "reference",
          "policyCode",
          "status",
          "reasonCodes",
          "createdAt",
          "updatedAt",
          "expiresAt",
          "version",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          environment: { type: "string", enum: ["SANDBOX", "LIVE"] },
          reference: { type: "string" },
          customerReference: { type: "string" },
          policyCode: { type: "string" },
          status: {
            type: "string",
            enum: [
              "CREATED",
              "IN_PROGRESS",
              "REVIEW_REQUIRED",
              "ACTION_REQUIRED",
              "VERIFIED",
              "REJECTED",
              "EXPIRED",
              "CANCELLED",
              "REVOKED",
            ],
          },
          reasonCodes: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          expiresAt: { type: "string", format: "date-time" },
          completedAt: { type: ["string", "null"], format: "date-time" },
          verifiedAt: { type: ["string", "null"], format: "date-time" },
          assuranceExpiresAt: { type: ["string", "null"], format: "date-time" },
          assuranceLevel: { type: ["string", "null"] },
          version: { type: "integer", minimum: 1 },
        },
      },
      Error: {
        type: "object",
        required: ["success", "error", "correlationId"],
        properties: {
          success: { const: false },
          error: {
            type: "object",
            required: ["code", "message", "retryable"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              retryable: { type: "boolean" },
            },
          },
          correlationId: { type: "string" },
        },
      },
      WebhookEvent: {
        type: "object",
        required: ["id", "type", "environment", "createdAt", "data"],
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string" },
          environment: { type: "string", enum: ["SANDBOX", "LIVE"] },
          createdAt: { type: "string", format: "date-time" },
          data: { type: "object", additionalProperties: true },
        },
      },
    },
  },
};
