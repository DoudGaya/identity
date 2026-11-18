export type Doc = {
  title: string;
  description: string;
  sections: { title: string; text: string; items?: string[]; code?: string }[];
};
export const docs: Record<string, Doc> = {
  "": {
    title: "Build trust into your next step.",
    description:
      "One workspace, a secure hosted journey and an API that keeps your systems in sync.",
    sections: [
      {
        title: "A clear path from your first test to production",
        text: "Create a client account, confirm your work email and set up your organisation. Sandbox verifications are clearly labelled simulations and are isolated from live records.",
        items: [
          "Start with the quickstart and create a sandbox session.",
          "Connect an HTTPS webhook endpoint and verify a signed test event.",
          "Complete workspace setup and request a production review.",
        ],
      },
      {
        title: "Keep identity information in the hosted journey",
        text: "Your application sends opaque customer references. Customers provide consent, identity attributes and evidence directly in the hosted verification experience. The partner API returns verification metadata and outcomes, not identity numbers or document files.",
      },
      {
        title: "Built around your server",
        text: "API credentials belong on your server. Use the Node.js SDK or the REST API, preserve idempotency keys across retries and confirm the final outcome through an authenticated API request or a signed event.",
      },
    ],
  },
  quickstart: {
    title: "Your first verification.",
    description:
      "A practical path from a new workspace to a connected sandbox integration.",
    sections: [
      {
        title: "1. Create and secure your workspace",
        text: "Register or sign in with your Nillar account. Verify your work email, add your organisation and use case, then connect an authenticator. Save the one-time recovery codes.",
      },
      {
        title: "2. Create a sandbox key",
        text: "Open Developer tools → API keys. Choose the minimum scopes, an expiry and a useful name. Copy the full key once into your server’s secret manager. Never use a NEXT_PUBLIC_ variable or put it in a mobile app.",
      },
      {
        title: "3. Create a hosted verification",
        text: "Generate and persist a unique idempotency key in your application before making the request. Reuse it if the same request needs to be retried. The personal profile uses CONSUMER_VA_P0 at the public API boundary and maps to a separate partner identity policy internally.",
        code: `import { randomUUID } from 'node:crypto';
import { NillarIdentity } from '@nillar/identity-node';

const identity = new NillarIdentity({
  apiKey: process.env.NILLAR_IDENTITY_API_KEY!,
});
const idempotencyKey = randomUUID(); // persist before calling
const { verification, launchUrl } = await identity.createVerification({
  customerReference: 'customer_123',
  reference: 'onboarding_123',
  policyCode: 'CONSUMER_VA_P0',
}, { idempotencyKey });`,
      },
      {
        title: "4. Open the hosted journey",
        text: "Share launchUrl through your application’s trusted channel. The link has a one-time ticket in its fragment and expires with the session after 30 minutes. Sandbox offers explicit simulated outcomes and never asks for real identity information.",
      },
      {
        title: "5. Confirm the outcome",
        text: "Subscribe to verification events and verify the webhook signature. Alternatively, retrieve the session status through your server. A browser redirect is not proof that someone has passed KYC.",
        code: `const { verification } = await identity.getVerification(sessionId);
if (verification.environment !== 'LIVE') {
  // This result is a sandbox simulation.
}
if (verification.status === 'VERIFIED') {
  // Apply your product's own eligibility and access policy.
}`,
      },
      {
        title: "6. Request production access",
        text: "Finish the setup checklist, receive a successful signed webhook and submit a production request. Live access requires independent review, separately activated production policies and the configured provider service.",
      },
    ],
  },
  "api-reference": {
    title: "A small API. A clear contract.",
    description:
      "Authenticated, scoped endpoints for hosted verification and status retrieval.",
    sections: [
      {
        title: "Base URL & authentication",
        text: "Send your API key in the Authorization header. Use only HTTPS in production. Key prefixes identify the environment: ni_test_ for sandbox and ni_live_ for live. A key can never read the other environment or another workspace.",
        code: `https://pay.nillar.com/api/v1/identity/partner

Authorization: Bearer <your-server-api-key>
Content-Type: application/json`,
      },
      {
        title: "Create a verification",
        text: "POST /verifications requires verifications:write and an Idempotency-Key of 8–128 letters, numbers, periods, underscores, colons or hyphens. Customer and verification references accept 3–80 letters, numbers, underscores or hyphens. Reusing a key with different fields returns 409.",
        code: `POST /verifications
Idempotency-Key: onboarding-attempt-123

{
  "customerReference": "customer_123",
  "reference": "onboarding_123",
  "policyCode": "CONSUMER_VA_P0"
}`,
      },
      {
        title: "Read, renew or cancel",
        text: "List and detail reads require verifications:read. Renew and cancel require verifications:write. Renewal invalidates the previous access credential, but does not extend the verification’s original expiry.",
        items: [
          "GET /verifications?limit=25&cursor=<nextCursor>&status=VERIFIED",
          "GET /verifications/{id}",
          "POST /verifications/{id}/renew",
          "POST /verifications/{id}/cancel",
        ],
      },
      {
        title: "Response envelope",
        text: "Successful responses include data and correlationId. Error responses include a safe code, message and retryable flag. Keep the reference when contacting support.",
        code: `{
  "success": true,
  "data": {
    "verification": { "id": "…", "status": "CREATED", "environment": "SANDBOX" },
    "launchUrl": "https://identity.nillar.com/start#ticket=…",
    "created": true
  },
  "correlationId": "…"
}`,
      },
      {
        title: "Return URLs",
        text: "A return URL must use HTTPS and an origin registered in workspace settings. Supply a cryptographically random state of 32–128 URL-safe characters with the URL. Check that state when the customer returns, then retrieve the verification result from your server.",
      },
      {
        title: "Capacity & pagination",
        text: "Sandbox is limited to 1,000 sessions per workspace per calendar month and 30 authenticated API requests per minute. The initial live capacity is managed by Nillar. List endpoints return items and nextCursor, with a maximum of 100 items per page. Use the returned cursor without constructing or changing it.",
      },
    ],
  },
  webhooks: {
    title: "Events you can verify.",
    description:
      "Keep your application in sync without trusting an unauthenticated callback.",
    sections: [
      {
        title: "Create a public HTTPS receiver",
        text: "Register your endpoint in the matching environment and save its one-time signing secret. Endpoints must use HTTPS on port 443, without credentials or query strings. Private addresses, metadata services, mixed public/private DNS answers and redirects are rejected.",
      },
      {
        title: "Verify the exact body and timestamp",
        text: "The nillar-signature header is t=<unix-seconds>,v1=<hex-HMAC-SHA256>. The signed content is the timestamp, a period and the untouched request body. Do not parse and re-serialize JSON before verification.",
        code: `import { constructWebhookEvent } from '@nillar/identity-node';

const rawBody = await request.text();
const event = constructWebhookEvent({
  body: rawBody,
  signature: request.headers.get('nillar-signature') || '',
  secret: process.env.NILLAR_WEBHOOK_SECRET!,
});
// Check environment. Deduplicate event.id in durable storage.
// Acknowledge promptly, then process asynchronously.`,
      },
      {
        title: "Event envelope",
        text: "The body contains id, type, environment, createdAt and data. It includes safe verification references and outcomes, not identity numbers, biometrics or evidence files. nillar-event-id repeats the event identifier in a header.",
        items: [
          "verification.created",
          "verification.updated",
          "verification.verified",
          "verification.rejected",
          "verification.review_required",
          "verification.expired",
          "verification.cancelled",
          "webhook.test",
        ],
      },
      {
        title: "Retries & delivery history",
        text: "Delivery is at least once. Return a 2xx response after verifying and durably accepting an event. Other responses and timeouts are retried with bounded exponential backoff, up to eight attempts. Events older than seven days stop retrying. Failed deliveries can be queued again from the dashboard while the endpoint is active.",
      },
      {
        title: "Connect the worker",
        text: "The deployment must schedule the authenticated /api/cron/identity-partners worker. A queued test is not a successful connection until a real 2xx delivery is recorded. Inspect pending, delivered and failed records in Developer tools → Deliveries.",
      },
      {
        title: "Rotate safely",
        text: "Rotating a signing secret invalidates the old value for future deliveries, including retries. Update your receiver to accept the new secret immediately. Keep event ID deduplication independent of the signing key.",
      },
    ],
  },
  sandbox: {
    title: "A safe place to get it right.",
    description: "Exercise the integration before involving real customers.",
    sections: [
      {
        title: "A separate environment",
        text: "Sandbox has separate credentials, customer references, sessions and webhook endpoints. It never sends NIN, BVN, documents or selfies to a provider. Results carry environment: SANDBOX and SANDBOX_SIMULATION reason codes.",
      },
      {
        title: "Test the full event journey",
        text: "Use the playground or your test API key to create a session. Open the hosted link, acknowledge that it is a simulation and choose verified, review required or rejected. Observe the event in delivery history and in your receiver.",
      },
      {
        title: "Try failure cases too",
        text: "Test a read-only key, expired/revoked keys, an unregistered return origin, a reused idempotency key with changed fields, a replayed hosted ticket and a receiver returning a non-2xx response.",
      },
      {
        title: "Move to live deliberately",
        text: "Changing the environment switch does not grant production access. Your organisation must pass review, and Nillar must activate the production provider, storage and policy controls. A sandbox success never establishes a real identity.",
      },
    ],
  },
  sdks: {
    title: "Less plumbing. More building.",
    description:
      "A server-side Node.js SDK, a complete API contract and practical examples.",
    sections: [
      {
        title: "Node.js SDK",
        text: "Use Node.js 20.11 or newer. The private package is supplied as a downloadable tarball. It has not been published to the public npm registry.",
        code: `npm install ./nillar-identity-node-0.1.0.tgz`,
      },
      {
        title: "Methods",
        text: "The SDK keeps your key server-side, derives its environment and exposes the implemented partner endpoints.",
        items: [
          "createVerification(input, { idempotencyKey })",
          "getVerification(id)",
          "listVerifications({ limit, cursor, status, search })",
          "renewVerificationLink(id)",
          "cancelVerification(id)",
          "constructWebhookEvent({ body, signature, secret })",
        ],
      },
      {
        title: "Retries & cancellation",
        text: "Read requests and creates with a preserved idempotency key have bounded retries for rate limiting or transient upstream errors. Link renewals and cancellations are not silently replayed. Pass an AbortSignal to cancel a request.",
      },
      {
        title: "Use another language",
        text: "The REST API uses ordinary HTTPS, JSON and bearer authentication. Download the OpenAPI contract or Postman collection to build a client in your preferred stack.",
      },
    ],
  },
  errors: {
    title: "Know what happened. Know what’s next.",
    description:
      "Errors are explicit, safe to display and tied to a request reference.",
    sections: [
      {
        title: "HTTP status codes",
        text: "Retry only when appropriate, keeping the same idempotency key for the same create operation.",
        items: [
          "401 · Sign in again, or replace an invalid, expired or revoked API key.",
          "403 · Check the key scope, workspace role, authenticator or live activation.",
          "404 · The resource is unavailable in this workspace and environment.",
          "409 · An idempotency conflict, used link or terminal verification needs a new operation.",
          "422 · Correct the request fields, return origin or authenticator code.",
          "429 · Wait before retrying; the workspace or request limit has been reached.",
          "503 · A required service, security guard or production capability is not available.",
        ],
      },
      {
        title: "Verification status is separate from HTTP status",
        text: "A successful API read does not mean identity verification passed. Check verification.status and environment. REVIEW_REQUIRED and ACTION_REQUIRED are not approvals.",
      },
      {
        title: "Share a safe support reference",
        text: "Include the workspace ID, environment, approximate time and correlationId. Never send API keys, webhook secrets, identity numbers, files or raw request bodies to support.",
      },
    ],
  },
  security: {
    title: "Make trust part of the integration.",
    description: "The controls your server and your team should keep in place.",
    sections: [
      {
        title: "Credentials & team access",
        text: "Each person uses their own account. MFA and a current authenticator code protect sensitive workspace changes. Keys are scoped, expire, can be revoked and are stored as hashes. Use separate keys per service and environment.",
      },
      {
        title: "Hosted access",
        text: "A hosted ticket can be redeemed once for a short-lived, session-scoped credential. Regenerating the link revokes its predecessor. Customer consent and provider-confirmed results remain part of the verification policy.",
      },
      {
        title: "Data boundaries",
        text: "The client API exposes references and status metadata. It does not return NIN/BVN values, customer documents, selfies or biometric templates. Evidence access remains an independently permissioned Nillar operations workflow.",
      },
      {
        title: "Your application’s responsibilities",
        text: "Keep secrets on the server, validate the return state, verify webhook signatures and timestamps, deduplicate event IDs, separate sandbox from live and apply your own product eligibility rules after a verified result.",
      },
      {
        title: "Production controls",
        text: "Live access requires business review, distinct approval, activated policies and configured production services. A provider lookup alone cannot complete KYC. Service unavailability and incomplete checks do not become successful verification.",
      },
    ],
  },
};
