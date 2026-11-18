# Nillar Identity

A separate Next.js application for client workspaces, developer integrations and hosted customer verification. It uses the existing Nillar account system through a restricted backend gateway.

## What is included

- Responsive black, white and stone dashboard with Instrument Sans, keyboard-accessible dialogs and mobile navigation.
- Account registration, OTP/password setup, work-email verification, invitation acceptance, recovery, authenticator setup and device sign-out.
- Workspace onboarding and progress checklist; team roles; organisation, privacy, return-origin and retention-review settings.
- Verification creation, detail/history, customer records, filters, exports, activity and usage.
- Scoped sandbox/live API keys with one-time secrets and MFA challenges; signed webhooks, test events, delivery status, attempt history, secret rotation and retry controls.
- Sandbox playground and one-use hosted verification links. Simulations are explicitly labelled and never establish a live identity outcome.
- Developer documentation, OpenAPI 3.1 at `/openapi.json`, Postman collection and server-only Node SDK download.
- Separate staff production approvals in `the-backend`, with two independent reviewers and explicit service activation gates.

The console returns references and verification outcomes. It does not expose raw identity numbers, documents or selfies. Browser gateways use HttpOnly cookies, CSRF/exact-origin checks, request allowlists and no-store responses. Hosted customer credentials are separate from the operator login and restricted to one verification.

## Local development

```powershell
cd C:\projects\the-pos\nillar-identity-web
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set `IDENTITY_PORTAL_MODE=staging` in `.env.local` to connect a synthetic backend. Match `IDENTITY_BACKEND_URL` and `IDENTITY_WEB_ORIGIN` to your local services. Open `http://127.0.0.1:3002`.

Preview mode does not enable backend operations. There is no built-in approval simulator for live customers and no sample identity should be submitted to a real provider. Browser tests intercept API calls with synthetic fixtures; those test fixtures are not a runtime authentication bypass.

Backend setup and release checks are documented in `../the-backend/docs/identity/CLIENT_PORTAL_RELEASE.md`. Install the new client migration before using workspace routes. Configure the backend hosted origin and encryption provider before issuing verification links and webhook secrets.

## Routes

`/register`, `/login`, `/forgot-password`, `/join`, `/start`, `/onboarding`, `/verify`, `/privacy`, `/terms`, `/docs` and `/openapi.json`.

`/dashboard` includes setup, verifications/new/detail, customers/detail, activity, usage, billing, developer keys, webhooks/detail, deliveries/attempts, request logs, playground, organisation settings, team, security/devices, verification settings, compliance and support. Unknown routes return 404. Private dashboard pages are excluded from indexing.

Billing shows measured usage, capacity and agreement status. Commercial prices, payment collection and production activation require a Nillar agreement; the interface does not invent subscription plans or charge users.

## Verification

```powershell
npm run check
npm run test:e2e
npm audit --omit=dev
```

The tests cover gateway boundaries, secrets, CSRF, routes, roles, responsive layouts, accessibility, one-time key handling, delivery diagnostics and the existing personal verification journey. New client pages use browser fixtures; actual live provider acceptance must be performed separately with authorised identities and environments.

The public policy labels `CONSUMER_VA_P0` / `BUSINESS_P0` map to dedicated partner policies on the backend. Client outcomes cannot activate Nillar bank accounts. Previously verified outcomes can expire or be revoked: consume versioned signed events or fetch the current status on your server.

## Live release requirements

Production needs the dedicated Identity schema, HTTPS portal/backend origins, server-only signing secrets, production KMS, private evidence storage/scanner, approved active policies, live provider acceptance, client agreements, operational ownership and a deployed reconciliation/delivery worker. Readiness scripts report configuration and database facts; passing frontend tests alone is not live KYC approval.

FIMS-only identifier lookup is not a full KYC decision. The existing FIMS and self-hosted biometric guides remain in `../the-backend/docs/identity`. Retention settings are review periods rather than automatic deletion promises.
# identity
