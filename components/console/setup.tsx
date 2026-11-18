"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Check, Mail, ShieldCheck } from "lucide-react";
import { consoleRequest } from "@/lib/console/client";
import type { Summary, Workspace } from "@/lib/console/contracts";
import { useConsole, useResource } from "./context";
import {
  Button,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHeading,
  Panel,
  StepUpField,
} from "./ui";
import { SetupChecklist } from "./overview";
export function EmailVerification() {
  const { bootstrap, reload } = useConsole(),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Panel
      title="Confirm your work email"
      description={`We’ll send a single-use code to ${bootstrap.user.email}.`}
    >
      <div className="console-panel-body">
        <p className="console-form-note">
          Your verified email is used for workspace ownership and team
          invitations.
        </p>
        {sent ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await consoleRequest("email/verify", {
                  method: "POST",
                  body: { code: new FormData(e.currentTarget).get("code") },
                });
                await reload();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to verify email.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email verification code">
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </Field>
            <Button busy={busy}>
              Verify email
              <ArrowRight size={14} />
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() => setSent(false)}
            >
              Request another code
            </Button>
          </form>
        ) : (
          <Button
            busy={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await consoleRequest("email/send", { method: "POST" });
                setSent(true);
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Email delivery is unavailable.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Mail size={15} />
            Send verification code
          </Button>
        )}
        {error && <Notice error>{error}</Notice>}
      </div>
    </Panel>
  );
}
type Draft = {
  name: string;
  website: string;
  businessType: string;
  registrationNumber: string;
  useCase: string;
  supportEmail: string;
  privacyUrl: string;
  returnOrigins: string;
  retentionDays: string;
};
export function WorkspaceForm({
  existing,
  onComplete,
}: {
  existing?: Workspace;
  onComplete?: (id: string) => Promise<void>;
}) {
  const { bootstrap, api, reload, link } = useConsole(),
    [step, setStep] = useState(existing ? 3 : 1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [draft, setDraft] = useState<Draft>({
    name: existing?.name || "",
    website: existing?.website || "",
    businessType: existing?.businessType || "COMPANY",
    registrationNumber: existing?.registrationNumber || "",
    useCase: existing?.useCase || "",
    supportEmail: existing?.supportEmail || bootstrap.user.email,
    privacyUrl: existing?.privacyUrl || "",
    returnOrigins: existing?.returnOrigins.join("\n") || "",
    retentionDays: String(existing?.retentionDays || 90),
  });
  const change = (key: keyof Draft, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!existing && step < 3) {
          setStep((s) => s + 1);
          return;
        }
        const values = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        setNotice("");
        try {
          const body = {
            ...draft,
            registrationNumber: draft.registrationNumber || undefined,
            returnOrigins: draft.returnOrigins
              .split(/\s+/)
              .map((s) => s.trim())
              .filter(Boolean),
            retentionDays: Number(draft.retentionDays),
            acceptTerms: true,
            ...(existing ? { securityCode: values.get("securityCode") } : {}),
          };
          if (existing) {
            await api("settings", { method: "PATCH", body });
            setNotice("Workspace settings saved.");
            await reload();
          } else {
            const result = await consoleRequest<{ workspace: { id: string } }>(
              "workspaces",
              { method: "POST", body },
            );
            await reload();
            await onComplete?.(result.workspace.id);
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to save your workspace.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {!existing && (
        <div className="console-panel-body" style={{ padding: "24px 24px 0" }}>
          <div className="console-registration-steps">
            {["Your organisation", "Your integration", "Review & create"].map(
              (label, i) => (
                <span
                  key={label}
                  aria-current={step === i + 1 ? "step" : undefined}
                >
                  <b>{step > i + 1 ? <Check size={11} /> : i + 1}</b>
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
      )}
      {(existing || step === 1) && (
        <div className="console-form-section">
          <h3>Your organisation</h3>
          <p>Use the business name your customers recognise.</p>
          <Field label="Workspace name">
            <input
              value={draft.name}
              onChange={(e) => change("name", e.target.value)}
              required
              minLength={2}
              maxLength={100}
              placeholder="Your company"
              autoComplete="organization"
            />
          </Field>
          <Field label="Company website">
            <input
              type="url"
              value={draft.website}
              onChange={(e) => change("website", e.target.value)}
              required
              placeholder="https://yourcompany.com"
              autoComplete="url"
            />
          </Field>
          <div className="console-fields-row">
            <Field label="Business type">
              <select
                value={draft.businessType}
                onChange={(e) => change("businessType", e.target.value)}
              >
                <option value="COMPANY">Registered company</option>
                <option value="SOLE_PROPRIETOR">Sole proprietor</option>
                <option value="NONPROFIT">Nonprofit</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Registration number (optional)">
              <input
                value={draft.registrationNumber}
                onChange={(e) => change("registrationNumber", e.target.value)}
                maxLength={50}
                placeholder="RC / BN number"
              />
            </Field>
          </div>
        </div>
      )}
      {(existing || step === 2) && (
        <div className="console-form-section">
          <h3>How you’ll use Nillar Identity</h3>
          <p>
            Tell us what you’re building and how your customers will be
            informed.
          </p>
          <Field
            label="Verification use case"
            hint="Describe the service, your customers and why identity verification is needed."
          >
            <textarea
              value={draft.useCase}
              onChange={(e) => change("useCase", e.target.value)}
              required
              minLength={20}
              maxLength={1000}
              placeholder="We need to verify…"
            />
          </Field>
          <Field label="Customer support email">
            <input
              type="email"
              value={draft.supportEmail}
              onChange={(e) => change("supportEmail", e.target.value)}
              required
              maxLength={254}
            />
          </Field>
          <Field label="Your privacy notice URL">
            <input
              type="url"
              value={draft.privacyUrl}
              onChange={(e) => change("privacyUrl", e.target.value)}
              required
              placeholder="https://yourcompany.com/privacy"
            />
          </Field>
          <Field
            label="Allowed return origins (optional)"
            hint="One exact HTTPS origin per line, without a path or trailing slash. These control where hosted verification can return."
          >
            <textarea
              value={draft.returnOrigins}
              onChange={(e) => change("returnOrigins", e.target.value)}
              placeholder="https://app.yourcompany.com"
              rows={2}
            />
          </Field>
          <Field
            label="Retention review period"
            hint="Used for retention reporting. This setting does not automatically destroy evidence."
          >
            <select
              value={draft.retentionDays}
              onChange={(e) => change("retentionDays", e.target.value)}
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">365 days</option>
            </select>
          </Field>
        </div>
      )}
      {!existing && step === 3 && (
        <div className="console-form-section">
          <h3>A workspace built around your business.</h3>
          <p>Check your details. You can update them securely later.</p>
          <dl className="console-properties" style={{ padding: 0 }}>
            {[
              ["Organisation", draft.name],
              ["Website", draft.website],
              ["Support email", draft.supportEmail],
              ["Privacy notice", draft.privacyUrl],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <Notice>
            Your workspace starts in sandbox. Live access requires a separate
            review and an activated production service.
          </Notice>
          <label className="console-check">
            <input type="checkbox" required />
            <span>
              I’m authorised to act for this organisation and accept the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer">
                Nillar Identity terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                privacy notice
              </Link>
              .
            </span>
          </label>
        </div>
      )}
      {existing && (
        <div className="console-form-section">
          {existing.productionStatus === "APPROVED" && (
            <Notice>
              Changes to your business identity, use case or privacy notice
              return live access to review. Existing live journeys for the
              previous business configuration will need a new session.
            </Notice>
          )}
          {bootstrap.user.mfa ? (
            <StepUpField />
          ) : (
            <Notice>
              Set up{" "}
              <Link href={link("/dashboard/settings/security")}>
                two-factor authentication
              </Link>{" "}
              before changing workspace settings.
            </Notice>
          )}
        </div>
      )}
      <div className="console-panel-body">
        {error && <Notice error>{error}</Notice>}
        {notice && <Notice>{notice}</Notice>}
        <div className="console-form-actions">
          {!existing && step > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft size={14} />
              Back
            </Button>
          )}
          <Button
            busy={busy}
            disabled={Boolean(existing && !bootstrap.user.mfa)}
          >
            {existing
              ? "Save changes"
              : step === 3
                ? "Create workspace"
                : "Continue"}
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </form>
  );
}
export function Setup() {
  const { workspace, bootstrap, link } = useConsole(),
    query = useSearchParams(),
    router = useRouter(),
    summary = useResource<Summary>(workspace ? "summary" : null);
  const creating = !workspace || query.get("new") === "1";
  return (
    <>
      <PageHeading
        eyebrow="GETTING STARTED"
        title={
          creating
            ? "Make room for what you’re building."
            : "From your first test to going live."
        }
        description={
          creating
            ? "A few business details, a secure account and a clear path to your first verification."
            : "Work through each step at your own pace. Your progress is saved as you connect your integration."
        }
      />
      {!bootstrap.user.emailVerified ? (
        <EmailVerification />
      ) : creating ? (
        <div className="console-setup-columns">
          <Panel>
            <WorkspaceForm
              onComplete={async (id) =>
                router.push(
                  `/dashboard/setup?workspace=${id}&environment=SANDBOX`,
                )
              }
            />
          </Panel>
          <div className="console-note-card" style={{ alignSelf: "start" }}>
            <ShieldCheck size={23} />
            <h2>Start simply. Build with confidence.</h2>
            <p>
              Your workspace keeps customers, API keys and events together.
              Sandbox data stays separate from live verification.
            </p>
            <p>
              All identity attributes and evidence are handled through the
              secure hosted journey.
            </p>
            <Link className="console-inline-link" href="/docs/quickstart">
              Read the quickstart
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : summary.error ? (
        <ErrorState error={summary.error} retry={summary.retry} />
      ) : summary.data ? (
        <div className="console-setup-columns">
          <SetupChecklist summary={summary.data} full />
          <div className="console-note-card" style={{ alignSelf: "start" }}>
            <ShieldCheck size={23} />
            <h2>Your next chapter is live.</h2>
            <p>
              Once you have completed the sandbox checklist, submit your
              organisation for a production review.
            </p>
            <Link
              className="console-button secondary"
              href={link("/dashboard/compliance")}
            >
              Review live requirements
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ) : (
        <Loading />
      )}
    </>
  );
}
