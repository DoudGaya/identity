"use client";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  may,
  safeCsv,
  type Customer,
  type PageResult,
  type Verification,
} from "@/lib/console/contracts";
import { useConsole, useResource } from "./context";
import { VerificationTable } from "./overview";
import {
  Button,
  CopyButton,
  date,
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
} from "./ui";
const ended = new Set([
  "VERIFIED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "REVOKED",
]);
export function downloadCsv(filename: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + safeCsv(rows)], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
export function Verifications() {
  const { workspace, link } = useConsole(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [history, setHistory] = useState<string[]>([]),
    cursor = history.at(-1),
    query = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    resource = useResource<PageResult<Verification>>(`verifications?${query}`);
  return (
    <>
      <PageHeading
        title="Verifications"
        description="Every customer journey, with a clear record of its progress and outcome."
        action={
          workspace && may(workspace.role, "verify") ? (
            <Link
              className="console-button"
              href={link("/dashboard/verifications/new")}
            >
              <Plus size={15} />
              New verification
            </Link>
          ) : undefined
        }
      />
      <Panel>
        <div className="console-toolbar">
          <form
            className="console-search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(
                String(new FormData(e.currentTarget).get("search") || ""),
              );
              setHistory([]);
            }}
          >
            <Search size={14} />
            <label className="sr-only" htmlFor="verification-search">
              Search customer or verification reference
            </label>
            <input
              id="verification-search"
              name="search"
              placeholder="Search by reference…"
              maxLength={80}
            />
          </form>
          <label className="sr-only" htmlFor="status-filter">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setHistory([]);
            }}
          >
            <option value="">All statuses</option>
            {[
              "CREATED",
              "IN_PROGRESS",
              "REVIEW_REQUIRED",
              "ACTION_REQUIRED",
              "VERIFIED",
              "REJECTED",
              "EXPIRED",
              "CANCELLED",
            ].map((s) => (
              <option value={s} key={s}>
                {s.toLowerCase().replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            className="compact"
            disabled={!resource.data?.items.length}
            onClick={() =>
              downloadCsv("nillar-verifications.csv", [
                [
                  "ID",
                  "Reference",
                  "Customer reference",
                  "Environment",
                  "Policy",
                  "Status",
                  "Created",
                ],
                ...resource.data!.items.map((item) => [
                  item.id,
                  item.reference,
                  item.customerReference,
                  item.environment,
                  item.policyCode,
                  item.status,
                  item.createdAt,
                ]),
              ])
            }
          >
            <Download size={13} />
            Export this page
          </Button>
        </div>
        {resource.error ? (
          <ErrorState error={resource.error} retry={resource.retry} />
        ) : resource.loading ? (
          <Loading />
        ) : resource.data?.items.length ? (
          <>
            <VerificationTable items={resource.data.items} />
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
            title={
              search || status
                ? "No matching verifications"
                : "A clear record of every check"
            }
            description={
              search || status
                ? "Try another reference or choose a different status."
                : "Create a verification to invite a customer into your secure hosted journey."
            }
          />
        )}
      </Panel>
    </>
  );
}
export function NewVerification() {
  const { workspace, environment, link, api } = useConsole(),
    query = useSearchParams(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      verification: Verification;
      launchUrl: string;
    } | null>(null),
    idem = useRef({ body: "", key: "" });
  return (
    <>
      <PageHeading
        eyebrow="HOSTED VERIFICATION"
        title="A confident first step."
        description="Create a secure, time-limited link. Your customer completes their details in the hosted journey."
        action={
          <Link
            className="console-button secondary"
            href={link("/dashboard/verifications")}
          >
            <ArrowLeft size={14} />
            All verifications
          </Link>
        }
      />
      <div className="console-detail-grid">
        <Panel
          title="New verification"
          description={`${environment === "SANDBOX" ? "Sandbox simulation" : "Live verification"} · Link expires in 30 minutes`}
        >
          <form
            className="console-panel-body"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              const values = new FormData(e.currentTarget),
                body = {
                  environment,
                  customerReference: values.get("customerReference"),
                  reference: values.get("reference"),
                  policyCode: values.get("policyCode"),
                  ...(values.get("returnUrl")
                    ? {
                        returnUrl: values.get("returnUrl"),
                        state: values.get("state"),
                      }
                    : {}),
                };
              const fingerprint = JSON.stringify(body);
              if (idem.current.body !== fingerprint)
                idem.current = { body: fingerprint, key: crypto.randomUUID() };
              try {
                setResult(
                  await api("verifications", {
                    method: "POST",
                    body,
                    key: idem.current.key,
                  }),
                );
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to create verification.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              label="Customer reference"
              hint="Your existing customer ID. Use letters, numbers, underscores and hyphens. Never use a name, phone number, NIN or BVN."
            >
              <input
                name="customerReference"
                required
                pattern="[A-Za-z0-9_-]{3,80}"
                maxLength={80}
                placeholder="customer_001"
                defaultValue={query.get("customer") || ""}
              />
            </Field>
            <Field
              label="Verification reference"
              hint="A reference from your own system for this particular check."
            >
              <input
                name="reference"
                required
                pattern="[A-Za-z0-9_-]{3,80}"
                maxLength={80}
                placeholder="verification_001"
              />
            </Field>
            <Field label="Verification policy">
              <select name="policyCode">
                <option value="CONSUMER_VA_P0">Personal identity</option>
                <option value="BUSINESS_P0">Business identity</option>
              </select>
            </Field>
            <details className="console-advanced">
              <summary>Return to your application (optional)</summary>
              <Field
                label="Return URL"
                hint="The exact HTTPS origin must be registered in workspace settings."
              >
                <input
                  type="url"
                  name="returnUrl"
                  placeholder="https://app.example.com/verification/complete"
                />
              </Field>
              <Field
                label="Random return state"
                hint="Supply 32–128 URL-safe characters, generated by your application and checked when the customer returns."
              >
                <input
                  name="state"
                  minLength={32}
                  maxLength={128}
                  pattern="[A-Za-z0-9_-]{32,128}"
                  autoComplete="off"
                />
              </Field>
            </details>
            {environment === "SANDBOX" && (
              <Notice>
                Sandbox outcomes are simulations. No provider lookup, real
                identity data or customer payment is involved.
              </Notice>
            )}
            {environment === "LIVE" &&
              workspace?.productionStatus !== "APPROVED" && (
                <Notice error>
                  Your workspace needs live approval before you can create a
                  real verification.{" "}
                  <Link href={link("/dashboard/compliance")}>
                    Review the requirements.
                  </Link>
                </Notice>
              )}
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                busy={busy}
                disabled={
                  !workspace ||
                  !may(workspace.role, "verify") ||
                  (environment === "LIVE" &&
                    workspace.productionStatus !== "APPROVED")
                }
              >
                Create verification
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        </Panel>
        <div className="console-note-card" style={{ alignSelf: "start" }}>
          <h2>Customer details stay with the customer.</h2>
          <p>
            Share the generated link through your own trusted channel. Your
            customer gives consent and completes the required checks directly
            with Nillar.
          </p>
          <p>
            Check the final result through the API or a signed webhook. A
            browser redirect is never proof that verification passed.
          </p>
          <Link className="console-inline-link" href="/docs/api-reference">
            Explore the verification API
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      {result && (
        <LaunchDialog
          url={result.launchUrl}
          id={result.verification.id}
          onClose={() => setResult(null)}
        />
      )}
    </>
  );
}
export function LaunchDialog({
  url,
  id,
  onClose,
}: {
  url: string;
  id: string;
  onClose: () => void;
}) {
  const { link } = useConsole();
  return (
    <Dialog
      title="Your verification link is ready."
      description="Share this link securely. It can be opened once and expires with this verification."
      onClose={onClose}
    >
      <div className="console-secret">
        <code>{url}</code>
        <CopyButton value={url} label="Copy verification link" />
      </div>
      <div className="console-form-actions">
        <a
          href={url}
          className="console-button secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open hosted journey
          <ArrowUpRight size={14} />
        </a>
        <Link
          className="console-button"
          href={link(`/dashboard/verifications/${id}`)}
        >
          View verification
          <ArrowRight size={14} />
        </Link>
      </div>
    </Dialog>
  );
}
export function VerificationDetail({ id }: { id: string }) {
  const { workspace, environment, api, invalidate, link } = useConsole(),
    resource = useResource<{
      verification: Verification;
      events: {
        id: string;
        type: string;
        createdAt: string;
        version: number;
      }[];
    }>(`verifications/${id}`),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState<"cancel" | "renew" | null>(null),
    [launch, setLaunch] = useState<string | null>(null);
  const value = resource.data?.verification;
  useEffect(() => {
    if (!value || ended.has(value.status)) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") invalidate();
    }, 15000);
    return () => clearInterval(timer);
  }, [value, invalidate]);
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.retry} />;
  if (!value) return <Loading />;
  const canEdit =
    workspace && may(workspace.role, "verify") && !ended.has(value.status);
  return (
    <>
      <PageHeading
        eyebrow="VERIFICATION DETAIL"
        title={value.reference}
        description="A record of this customer’s verification journey. Identity attributes and documents are not exposed here."
        action={
          <Button variant="secondary" onClick={invalidate}>
            <RefreshCw size={14} />
            Refresh status
          </Button>
        }
      />
      <div className="console-detail-grid">
        <div className="console-stack">
          <Panel
            title="Verification overview"
            action={<Status value={value.status} />}
          >
            <dl className="console-properties">
              {[
                ["Verification ID", value.id],
                ["Customer reference", value.customerReference || "—"],
                ["Environment", environment],
                [
                  "Policy",
                  value.policyCode === "BUSINESS_P0"
                    ? "Business identity"
                    : "Personal identity",
                ],
                ["Created", date(value.createdAt, true)],
                ["Expires", date(value.expiresAt, true)],
                ["Completed", date(value.completedAt, true)],
                ["Verified", date(value.verifiedAt, true)],
                ["Assurance valid until", date(value.assuranceExpiresAt, true)],
                ["Assurance level", value.assuranceLevel || "Not established"],
              ].map(([key, val]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd
                    className={
                      key === "Verification ID" ? "console-mono" : undefined
                    }
                  >
                    {val}
                  </dd>
                </div>
              ))}
            </dl>
            {value.reasonCodes.length > 0 && (
              <div className="console-panel-body">
                <p className="console-help">Service reason codes</p>
                <div className="console-tag-list">
                  {value.reasonCodes.map((reason) => (
                    <span className="console-tag" key={reason}>
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {canEdit && (
              <div className="console-detail-actions">
                <Button variant="secondary" onClick={() => setConfirm("renew")}>
                  Regenerate link
                </Button>
                <Button variant="quiet" onClick={() => setConfirm("cancel")}>
                  Cancel verification
                </Button>
              </div>
            )}
          </Panel>
          {value.status === "REVIEW_REQUIRED" && (
            <Notice>
              The verification policy requires a review. Your team can monitor
              the result here; approval remains with Nillar’s authorised review
              process.
            </Notice>
          )}
          {environment === "SANDBOX" && canEdit && (
            <Panel
              title="Test a sandbox outcome"
              description="Explicit simulations for integration testing. These are never live identity decisions."
            >
              <div className="console-detail-actions">
                {["VERIFIED", "REVIEW_REQUIRED", "REJECTED"].map((outcome) => (
                  <Button
                    key={outcome}
                    variant="secondary"
                    busy={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await api(`verifications/${id}/simulate`, {
                          method: "POST",
                          body: { outcome },
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
                ))}
              </div>
            </Panel>
          )}
          {error && <Notice error>{error}</Notice>}
        </div>
        <Panel
          title="Journey timeline"
          description="Service events in reverse chronological order."
        >
          {resource.data?.events.length ? (
            <ol className="console-timeline">
              {resource.data.events.map((event) => (
                <li key={event.id}>
                  <span className="console-timeline-dot" />
                  <div>
                    <strong>
                      {event.type
                        .replace("verification.", "")
                        .replaceAll("_", " ")}
                    </strong>
                    <p>
                      {date(event.createdAt, true)} · Version {event.version}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Empty
              title="No events recorded yet"
              description="Events appear as this verification progresses."
            />
          )}
        </Panel>
      </div>
      <Link
        className="console-inline-link"
        style={{ marginTop: 24 }}
        href={link("/dashboard/verifications")}
      >
        <ArrowLeft size={14} />
        Back to verifications
      </Link>
      {confirm && (
        <Dialog
          title={
            confirm === "cancel"
              ? "Cancel this verification?"
              : "Create a new access link?"
          }
          description={
            confirm === "cancel"
              ? "The hosted journey will stop accepting information. This action cannot be undone."
              : "The previous link and its scoped access credential will stop working. The verification’s original expiry time stays the same."
          }
          onClose={() => setConfirm(null)}
        >
          <div className="console-form-actions">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Keep existing
            </Button>
            <Button
              variant={confirm === "cancel" ? "danger" : "primary"}
              busy={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  const result = await api<{ launchUrl?: string }>(
                    `verifications/${id}/${confirm}`,
                    { method: "POST" },
                  );
                  if (result.launchUrl) setLaunch(result.launchUrl);
                  setConfirm(null);
                  invalidate();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Unable to update verification.",
                  );
                  setConfirm(null);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirm === "cancel" ? "Cancel verification" : "Regenerate link"}
            </Button>
          </div>
        </Dialog>
      )}
      {launch && (
        <LaunchDialog url={launch} id={id} onClose={() => setLaunch(null)} />
      )}
    </>
  );
}
export function Customers() {
  const { link } = useConsole(),
    [search, setSearch] = useState(""),
    [history, setHistory] = useState<string[]>([]),
    cursor = history.at(-1),
    query = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(cursor ? { cursor } : {}),
    }),
    resource = useResource<PageResult<Customer>>(`customers?${query}`);
  return (
    <>
      <PageHeading
        title="Customers"
        description="One reference for each customer, with their verification history in one place."
      />
      <Panel>
        <div className="console-toolbar">
          <form
            className="console-search"
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(
                String(new FormData(e.currentTarget).get("search") || ""),
              );
              setHistory([]);
            }}
          >
            <Search size={14} />
            <label className="sr-only" htmlFor="customer-search">
              Search customer reference
            </label>
            <input
              id="customer-search"
              name="search"
              placeholder="Search by customer reference…"
              maxLength={80}
            />
          </form>
        </div>
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
                    <th>CUSTOMER REFERENCE</th>
                    <th>VERIFICATIONS</th>
                    <th>FIRST SEEN</th>
                    <th>
                      <span className="sr-only">Open customer</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={link(`/dashboard/customers/${item.id}`)}>
                          {item.reference}
                          <small className="mono">{item.id.slice(0, 8)}…</small>
                        </Link>
                      </td>
                      <td>{item._count?.verifications || 0}</td>
                      <td>{date(item.createdAt)}</td>
                      <td>
                        <Link
                          href={link(`/dashboard/customers/${item.id}`)}
                          aria-label={`View ${item.reference}`}
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </td>
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
            title={
              search
                ? "No matching customers"
                : "Your customer directory will grow here"
            }
            description="Customers are created automatically when you start a verification with their reference."
          />
        )}
      </Panel>
    </>
  );
}
export function CustomerDetail({ id }: { id: string }) {
  const { link } = useConsole(),
    resource = useResource<{
      customer: Customer;
      verifications: Verification[];
    }>(`customers/${id}`);
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.retry} />;
  if (!resource.data) return <Loading />;
  const { customer, verifications } = resource.data;
  return (
    <>
      <PageHeading
        eyebrow="CUSTOMER RECORD"
        title={customer.reference}
        description={`First seen ${date(customer.createdAt)}. This record uses your integration reference and contains no raw identity attributes.`}
        action={
          <Link
            className="console-button"
            href={
              link("/dashboard/verifications/new") +
              `&customer=${encodeURIComponent(customer.reference)}`
            }
          >
            <Plus size={14} />
            New verification
          </Link>
        }
      />
      <Panel
        title="Verification history"
        description="The 50 most recent verifications for this customer."
      >
        {verifications.length ? (
          <VerificationTable
            items={verifications.map((v) => ({
              ...v,
              customerReference: customer.reference,
            }))}
          />
        ) : (
          <Empty
            title="No verifications recorded"
            description="Start a verification to add to this customer’s history."
          />
        )}
      </Panel>
    </>
  );
}
