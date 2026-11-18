"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  FlaskConical,
  Play,
  RefreshCw,
} from "lucide-react";
import {
  may,
  type ApiLog,
  type Audit,
  type PageResult,
  type Summary,
  type Usage,
  type Verification,
} from "@/lib/console/contracts";
import { useConsole, useResource } from "./context";
import { ActivityChart, SetupChecklist } from "./overview";
import { LaunchDialog, downloadCsv } from "./verifications";
import {
  Button,
  count,
  date,
  CopyButton,
  Dialog,
  Empty,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHeading,
  Pagination,
  Panel,
  Status,
  StepUpField,
} from "./ui";
export function Activity() {
  const [history, setHistory] = useState<string[]>([]),
    cursor = history.at(-1),
    resource = useResource<PageResult<Audit>>(
      `activity${cursor ? "?cursor=" + cursor : ""}`,
    );
  return (
    <>
      <PageHeading
        title="Workspace activity"
        description="A shared record of changes to your workspace, integrations and team access."
      />
      <Panel>
        {resource.error ? (
          <ErrorState error={resource.error} retry={resource.retry} />
        ) : resource.loading ? (
          <Loading />
        ) : resource.data?.items.length ? (
          <>
            <div className="console-table-wrap">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>ACTION</th>
                    <th>ACTOR</th>
                    <th>RECORD</th>
                    <th>WHEN</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.action
                          .replaceAll(".", " · ")
                          .replaceAll("_", " ")}
                      </td>
                      <td className="console-mono">
                        {item.actorId.slice(0, 20)}
                      </td>
                      <td className="console-mono">
                        {item.entityId
                          ? item.entityId.slice(0, 14) + "…"
                          : "Workspace"}
                      </td>
                      <td>{date(item.createdAt, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              nextCursor={resource.data.nextCursor}
              hasPrevious={history.length > 0}
              onPrevious={() => setHistory((h) => h.slice(0, -1))}
              onNext={() =>
                setHistory((h) => [...h, resource.data!.nextCursor!])
              }
            />
          </>
        ) : (
          <Empty
            title="No workspace changes yet"
            description="Security, integration and team changes are recorded here as they happen."
          />
        )}
      </Panel>
    </>
  );
}
export function ApiRequests() {
  const [history, setHistory] = useState<string[]>([]),
    cursor = history.at(-1),
    resource = useResource<PageResult<ApiLog>>(
      `requests${cursor ? "?cursor=" + cursor : ""}`,
    );
  return (
    <>
      <PageHeading
        eyebrow="DEVELOPER TOOLS"
        title="Every request, accounted for."
        description="Request metadata and timings, without API secrets, raw request bodies or customer identity attributes."
        action={
          <Button variant="secondary" onClick={resource.retry}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />
      <Panel>
        {resource.error ? (
          <ErrorState error={resource.error} retry={resource.retry} />
        ) : resource.loading ? (
          <Loading />
        ) : resource.data?.items.length ? (
          <>
            <div className="console-table-wrap">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>OPERATION</th>
                    <th>STATUS</th>
                    <th>DURATION</th>
                    <th>REQUEST ID</th>
                    <th>WHEN</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.method}
                        <small>{item.operation}</small>
                        {item.errorCode && <small>{item.errorCode}</small>}
                      </td>
                      <td>
                        <Status value={String(item.status)} />
                      </td>
                      <td>{item.durationMs} ms</td>
                      <td>
                        <span className="console-mono">
                          {(item.correlationId || item.id).slice(0, 8)}…
                        </span>
                        <CopyButton
                          value={item.correlationId || item.id}
                          label="Copy request ID"
                        />
                      </td>
                      <td>{date(item.createdAt, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              nextCursor={resource.data.nextCursor}
              hasPrevious={history.length > 0}
              onPrevious={() => setHistory((h) => h.slice(0, -1))}
              onNext={() =>
                setHistory((h) => [...h, resource.data!.nextCursor!])
              }
            />
          </>
        ) : (
          <Empty
            title="Your first server request will appear here"
            description="Requests made with your API keys are recorded here. Workspace and playground actions appear in Activity."
            action={
              <Link
                className="console-button secondary"
                href="/docs/quickstart"
              >
                Make your first API request
                <ArrowRight size={14} />
              </Link>
            }
          />
        )}
      </Panel>
    </>
  );
}
export function UsagePage({ billing = false }: { billing?: boolean }) {
  const { link, environment } = useConsole(),
    [days, setDays] = useState(30),
    resource = useResource<Usage>(`usage?days=${days}`),
    summary = useResource<Summary>("summary");
  return (
    <>
      <PageHeading
        title={billing ? "Billing overview" : "Usage, without the guesswork."}
        description="Understand verification volume and API responses in the environment you’ve selected."
        action={
          <div style={{ display: "flex", gap: 9 }}>
            <label className="sr-only" htmlFor="usage-range">
              Reporting period
            </label>
            <select
              id="usage-range"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button
              variant="secondary"
              disabled={!resource.data}
              onClick={() =>
                downloadCsv("nillar-identity-usage.csv", [
                  ["UTC day", "Verifications created", "Verified"],
                  ...resource.data!.daily.map((d) => [
                    d.day,
                    d.total,
                    d.verified,
                  ]),
                ])
              }
            >
              <Download size={14} />
              Export
            </Button>
          </div>
        }
      />
      {resource.error ? (
        <ErrorState error={resource.error} retry={resource.retry} />
      ) : !resource.data ? (
        <Loading />
      ) : (
        <>
          <div className="console-metrics">
            <div className="console-metric">
              <span className="console-metric-label">
                Verifications this period
              </span>
              <strong>
                {count(resource.data.daily.reduce((s, d) => s + d.total, 0))}
              </strong>
              <small>Created in the last {days} days</small>
            </div>
            <div className="console-metric">
              <span className="console-metric-label">Verified</span>
              <strong>
                {count(resource.data.daily.reduce((s, d) => s + d.verified, 0))}
              </strong>
              <small>Current outcome of these sessions</small>
            </div>
            <div className="console-metric">
              <span className="console-metric-label">API requests</span>
              <strong>
                {count(resource.data.requests.reduce((s, d) => s + d.count, 0))}
              </strong>
              <small>Authenticated server requests</small>
            </div>
            <div className="console-metric">
              <span className="console-metric-label">Active keys</span>
              <strong>{count(resource.data.activeKeys)}</strong>
              <small>Unexpired, unrevoked credentials</small>
            </div>
          </div>
          <div className="console-grid">
            <Panel
              title="Verification volume"
              description={`Last ${days} days · ${environment.toLowerCase()} environment`}
            >
              <ActivityChart data={resource.data.daily} days={days} />
            </Panel>
            <Panel title="Monthly capacity">
              {summary.error ? (
                <ErrorState error={summary.error} retry={summary.retry} />
              ) : !summary.data ? (
                <Loading />
              ) : (
                <div className="console-usage-summary">
                  <p className="console-summary-number">
                    {count(summary.data.monthUsage)}
                  </p>
                  <p>
                    of {count(summary.data.monthlyLimit)} verification sessions
                    this calendar month
                  </p>
                  <div className="console-progress">
                    <span
                      style={{
                        width: `${Math.min(100, (summary.data.monthUsage / Math.max(1, summary.data.monthlyLimit)) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="console-help" style={{ marginTop: 15 }}>
                    A session is counted once when created. Idempotent retries
                    reuse the original session.
                  </p>
                </div>
              )}
            </Panel>
          </div>
          <Panel
            title="Billing & commercial access"
            className="console-margin-top"
          >
            <div className="console-panel-body">
              <Status value={resource.data.billing.status} />
              <p className="console-form-note" style={{ marginTop: 16 }}>
                {resource.data.billing.message}
              </p>
              <Link
                className="console-inline-link"
                href={link("/dashboard/support")}
              >
                Contact Nillar about your agreement
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </Panel>
          <Panel
            title="API response distribution"
            className="console-margin-top"
          >
            {resource.data.requests.length ? (
              <div className="console-table-wrap">
                <table className="console-table">
                  <thead>
                    <tr>
                      <th>HTTP RESPONSE</th>
                      <th>REQUESTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.requests.map((row) => (
                      <tr key={row.status}>
                        <td>
                          <Status value={String(row.status)} />
                        </td>
                        <td>{count(row.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="No API requests in this period"
                description="Authenticated requests from your server will be counted here."
              />
            )}
          </Panel>
        </>
      )}
    </>
  );
}
export function Playground() {
  const { workspace, environment, selectEnvironment, api, invalidate, link } =
      useConsole(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      verification: Verification;
      launchUrl: string;
    } | null>(null),
    [launch, setLaunch] = useState(false),
    idem = useRef({ fingerprint: "", key: "" });
  return (
    <>
      <PageHeading
        eyebrow="SANDBOX PLAYGROUND"
        title="Try it. See how it moves."
        description="Create a test session, choose an explicit outcome and watch the event reach your integration."
      />
      {environment === "LIVE" ? (
        <Panel>
          <Empty
            title="Your playground runs in sandbox"
            description="Live identity outcomes are determined by the verification service. Switch to sandbox to run simulations."
            action={
              <Button onClick={() => selectEnvironment("SANDBOX")}>
                <FlaskConical size={14} />
                Switch to sandbox
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="console-detail-grid">
          <Panel
            title="Create a sandbox session"
            description="No provider calls. No identity numbers or documents."
          >
            <form
              className="console-panel-body"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const values = new FormData(e.currentTarget),
                  body = {
                    environment: "SANDBOX",
                    customerReference: values.get("customerReference"),
                    reference: values.get("reference"),
                    policyCode: "CONSUMER_VA_P0",
                  },
                  fingerprint = JSON.stringify(body);
                if (idem.current.fingerprint !== fingerprint)
                  idem.current = { fingerprint, key: crypto.randomUUID() };
                try {
                  setResult(
                    await api("verifications", {
                      method: "POST",
                      body,
                      key: idem.current.key,
                    }),
                  );
                  invalidate();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Unable to create sandbox session.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Test customer reference">
                <input
                  name="customerReference"
                  required
                  pattern="[A-Za-z0-9_-]{3,80}"
                  defaultValue="sandbox_customer_001"
                />
              </Field>
              <Field label="Test verification reference">
                <input
                  name="reference"
                  required
                  pattern="[A-Za-z0-9_-]{3,80}"
                  defaultValue="sandbox_check_001"
                />
              </Field>
              <Notice>
                This is a simulated verification. A sandbox “verified” result
                does not establish a real person’s identity.
              </Notice>
              {error && <Notice error>{error}</Notice>}
              <Button
                busy={busy}
                disabled={
                  !workspace ||
                  !may(workspace.role, "verify") ||
                  Boolean(result)
                }
              >
                <Play size={14} />
                Create sandbox session
              </Button>
              {result && (
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => {
                    setResult(null);
                    idem.current = { fingerprint: "", key: "" };
                  }}
                >
                  Start another test
                </Button>
              )}
            </form>
          </Panel>
          <div className="console-stack">
            <Panel
              title="Your session"
              action={
                result ? (
                  <Status value={result.verification.status} />
                ) : undefined
              }
            >
              {result ? (
                <div className="console-panel-body">
                  <pre className="console-code">
                    {JSON.stringify(
                      {
                        id: result.verification.id,
                        environment: result.verification.environment,
                        status: result.verification.status,
                        reference: result.verification.reference,
                        version: result.verification.version,
                      },
                      null,
                      2,
                    )}
                  </pre>
                  <div
                    className="console-detail-actions"
                    style={{ padding: 0 }}
                  >
                    <Button variant="secondary" onClick={() => setLaunch(true)}>
                      Open hosted test journey
                      <ArrowUpRight size={13} />
                    </Button>
                    <Link
                      className="console-inline-link"
                      href={link(
                        `/dashboard/verifications/${result.verification.id}`,
                      )}
                    >
                      View details
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                  {!["VERIFIED", "REJECTED", "EXPIRED", "CANCELLED"].includes(
                    result.verification.status,
                  ) && (
                    <>
                      <p className="console-help" style={{ marginTop: 24 }}>
                        Or simulate the service outcome here:
                      </p>
                      <div className="console-tag-list">
                        {["VERIFIED", "REVIEW_REQUIRED", "REJECTED"].map(
                          (outcome) => (
                            <Button
                              key={outcome}
                              variant="secondary"
                              busy={busy}
                              onClick={async () => {
                                setBusy(true);
                                setError("");
                                try {
                                  const next = await api<{
                                    verification: Verification;
                                  }>(
                                    `verifications/${result.verification.id}/simulate`,
                                    { method: "POST", body: { outcome } },
                                  );
                                  setResult({
                                    ...result,
                                    verification: next.verification,
                                  });
                                  invalidate();
                                } catch (err) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : "Unable to simulate outcome.",
                                  );
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              {outcome.toLowerCase().replaceAll("_", " ")}
                            </Button>
                          ),
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Empty
                  title="A test you can follow"
                  description="Your session response and outcome controls will appear when you create a sandbox session."
                />
              )}
            </Panel>
            <div className="console-note-card">
              <h2>Watch it all connect.</h2>
              <p>
                A simulated status change creates the same event envelope used
                by the live API, clearly marked as sandbox. Your registered
                sandbox endpoint receives a signed delivery.
              </p>
              <Link
                className="console-inline-link"
                href={link("/dashboard/developers/deliveries")}
              >
                Inspect webhook deliveries
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
      {result && launch && (
        <LaunchDialog
          url={result.launchUrl}
          id={result.verification.id}
          onClose={() => setLaunch(false)}
        />
      )}
    </>
  );
}
export function Compliance() {
  const { workspace, bootstrap, api, invalidate, reload, link } = useConsole(),
    summary = useResource<Summary>("summary"),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (summary.error)
    return <ErrorState error={summary.error} retry={summary.retry} />;
  if (!summary.data || !workspace) return <Loading />;
  const done = Object.values(summary.data.setup).every(Boolean),
    allowed = may(workspace.role, "manage");
  return (
    <>
      <PageHeading
        eyebrow="PRODUCTION ACCESS"
        title="The next step is live."
        description="Complete your integration, confirm your business use case and submit a request for production review."
      />
      <div className="console-setup-columns">
        <SetupChecklist summary={summary.data} full />
        <div className="console-stack" style={{ alignSelf: "start" }}>
          <Panel
            title="Your production request"
            action={<Status value={workspace.productionStatus} />}
          >
            <div className="console-panel-body">
              <p className="console-form-note" style={{ marginTop: 12 }}>
                {workspace.productionStatus === "APPROVED"
                  ? "Your organisation has been approved. Live requests also require the production verification service to be activated."
                  : workspace.productionStatus === "IN_REVIEW"
                    ? "Your request is with Nillar. Two independent authorised reviewers are required before live access can be activated."
                    : "A production review covers your business, intended use, integration and service activation."}
              </p>
              {workspace.productionReason && (
                <Notice>
                  {workspace.productionReason
                    .replaceAll("_", " ")
                    .toLowerCase()}
                </Notice>
              )}
              {workspace.productionRequestedAt && (
                <p className="console-help">
                  Submitted {date(workspace.productionRequestedAt)}
                </p>
              )}
              {allowed &&
                !["APPROVED", "IN_REVIEW"].includes(
                  workspace.productionStatus,
                ) && (
                  <Button
                    disabled={!done || !bootstrap.user.mfa}
                    onClick={() => setOpen(true)}
                  >
                    Request live review
                    <ArrowRight size={14} />
                  </Button>
                )}
              {!done && (
                <p className="console-help" style={{ marginTop: 13 }}>
                  Complete the checklist to unlock your review request.
                </p>
              )}
            </div>
          </Panel>
          <div className="console-note-card">
            <h2>Strong foundations, from day one.</h2>
            <p>
              Live and sandbox keys cannot be interchanged. A provider lookup
              alone never marks someone verified. Required identity, evidence
              and policy checks still apply.
            </p>
            <Link className="console-inline-link" href="/docs/security">
              How the integration is protected
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
      {open && (
        <Dialog
          title="Submit for production review"
          description="Confirm that your business details, privacy notice and integration are ready for review."
          onClose={() => setOpen(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api("production", {
                  method: "POST",
                  body: {
                    securityCode: new FormData(e.currentTarget).get(
                      "securityCode",
                    ),
                  },
                });
                setOpen(false);
                invalidate();
                await reload();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to submit review.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="console-check">
              <input type="checkbox" required />
              <span>
                I’m authorised to request live access for this organisation and
                confirm the information in workspace settings is accurate.
              </span>
            </label>
            <StepUpField />
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Back
              </Button>
              <Button busy={busy}>
                Submit review
                <Check size={14} />
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      <Link
        className="console-inline-link"
        style={{ marginTop: 24 }}
        href={link("/dashboard/support")}
      >
        Need help with your request?
        <ArrowRight size={14} />
      </Link>
    </>
  );
}
