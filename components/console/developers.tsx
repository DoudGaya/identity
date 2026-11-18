"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldCheck,
  Webhook,
} from "lucide-react";
import {
  eventTypes,
  may,
  type ApiKey,
  type Delivery,
  type Endpoint,
  type PageResult,
} from "@/lib/console/contracts";
import { useConsole, useResource } from "./context";
import {
  Button,
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
  SecretDialog,
  Status,
  StepUpField,
} from "./ui";
function MfaNeeded() {
  const { link } = useConsole();
  return (
    <Notice>
      <ShieldCheck size={14} /> Set up{" "}
      <Link
        href={link("/dashboard/settings/security")}
        className="console-inline-link"
      >
        two-factor authentication
      </Link>{" "}
      before creating credentials or changing integration settings.
    </Notice>
  );
}
export function ApiKeys() {
  const { workspace, bootstrap, environment, api, invalidate } = useConsole(),
    resource = useResource<{ items: ApiKey[] }>("keys"),
    [create, setCreate] = useState(false),
    [revoke, setRevoke] = useState<ApiKey | null>(null),
    [secret, setSecret] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const allowed = workspace && may(workspace.role, "develop");
  return (
    <>
      <PageHeading
        eyebrow="DEVELOPER TOOLS"
        title="Keys to your integration."
        description="Scoped, expiring credentials for your server. Sandbox and live keys are kept separate."
        action={
          allowed ? (
            <Button
              onClick={() => {
                setError("");
                setCreate(true);
              }}
              disabled={!bootstrap.user.mfa}
            >
              <Plus size={15} />
              Create API key
            </Button>
          ) : undefined
        }
      />
      {!bootstrap.user.mfa && allowed && <MfaNeeded />}
      <Panel
        title={`${environment === "SANDBOX" ? "Sandbox" : "Live"} API keys`}
        description="A full key is shown only when it is created."
      >
        {resource.error ? (
          <ErrorState error={resource.error} retry={resource.retry} />
        ) : resource.loading ? (
          <Loading />
        ) : resource.data?.items.length ? (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>NAME & PREFIX</th>
                  <th>PERMISSIONS</th>
                  <th>STATUS</th>
                  <th>EXPIRES</th>
                  <th>LAST USED</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((key) => (
                  <tr key={key.id}>
                    <td>
                      {key.name}
                      <small className="mono">{key.prefix}••••••••</small>
                    </td>
                    <td>
                      {key.scopes.map((scope) => (
                        <div key={scope} className="console-mono">
                          {scope}
                        </div>
                      ))}
                    </td>
                    <td>
                      <Status
                        value={
                          key.revokedAt
                            ? "REVOKED"
                            : new Date(key.expiresAt) < new Date()
                              ? "EXPIRED"
                              : "ACTIVE"
                        }
                      />
                    </td>
                    <td>{date(key.expiresAt)}</td>
                    <td>
                      {key.lastUsedAt
                        ? date(key.lastUsedAt, true)
                        : "Not used yet"}
                    </td>
                    <td>
                      {allowed && !key.revokedAt && (
                        <Button
                          variant="quiet"
                          className="compact"
                          onClick={() => {
                            setError("");
                            setRevoke(key);
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Your integration starts with a key"
            description="Create a key with only the permissions your application needs, then keep it in your server’s secret manager."
          />
        )}
      </Panel>
      <div className="console-feature-links">
        <Link href="/docs/quickstart">
          <KeyRound size={20} />
          <h3>Your first authenticated request</h3>
          <p>Set up your server and create a hosted verification.</p>
        </Link>
        <Link href="/docs/security">
          <ShieldCheck size={20} />
          <h3>Keep your keys in the right place</h3>
          <p>Key storage, least privilege and a safe rotation process.</p>
        </Link>
        <Link href="/docs/api-reference">
          <Copy size={20} />
          <h3>Predictable API responses</h3>
          <p>Understand status codes, pagination and idempotency.</p>
        </Link>
      </div>
      {create && (
        <Dialog
          title={`Create a ${environment === "SANDBOX" ? "sandbox" : "live"} API key`}
          description="Choose a name, the minimum permissions and an expiry."
          onClose={() => setCreate(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const values = new FormData(e.currentTarget);
              try {
                const result = await api<{ secret: string }>("keys", {
                  method: "POST",
                  body: {
                    name: values.get("name"),
                    environment,
                    scopes: values.getAll("scopes"),
                    expiresInDays: Number(values.get("expiresInDays")),
                    securityCode: values.get("securityCode"),
                  },
                });
                setSecret(result.secret);
                setCreate(false);
                invalidate();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Unable to create key.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Key name">
              <input
                name="name"
                minLength={2}
                maxLength={80}
                required
                placeholder="Application server"
              />
            </Field>
            <p className="console-help">Permissions</p>
            <label className="console-check">
              <input
                name="scopes"
                value="verifications:read"
                type="checkbox"
                defaultChecked
              />
              <span>Read verification statuses and lists</span>
            </label>
            <label className="console-check">
              <input
                name="scopes"
                value="verifications:write"
                type="checkbox"
                defaultChecked
              />
              <span>Create, renew and cancel hosted verifications</span>
            </label>
            <Field label="Expiry">
              <select name="expiresInDays" defaultValue="90">
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
              </select>
            </Field>
            <StepUpField />
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreate(false)}
              >
                Cancel
              </Button>
              <Button busy={busy}>
                Create key
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {revoke && (
        <Dialog
          title="Revoke this API key?"
          description={`${revoke.name} will stop authenticating requests immediately. Your application must use a replacement key.`}
          onClose={() => setRevoke(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(`keys/${revoke.id}/revoke`, {
                  method: "POST",
                  body: {
                    securityCode: new FormData(e.currentTarget).get(
                      "securityCode",
                    ),
                  },
                });
                setRevoke(null);
                invalidate();
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Unable to revoke key.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <StepUpField />
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRevoke(null)}
              >
                Keep key
              </Button>
              <Button variant="danger" busy={busy}>
                Revoke key
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {secret && (
        <SecretDialog
          title="Save your API key."
          value={secret}
          onClose={() => setSecret("")}
        />
      )}
    </>
  );
}
export function Webhooks() {
  const { workspace, bootstrap, environment, api, invalidate, link } =
      useConsole(),
    resource = useResource<{ items: Endpoint[] }>("webhooks"),
    [create, setCreate] = useState(false),
    [secret, setSecret] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const allowed = workspace && may(workspace.role, "develop");
  return (
    <>
      <PageHeading
        eyebrow="EVENT CONNECTIONS"
        title="Keep your systems in sync."
        description="Receive signed events when a verification changes. Inspect each delivery and retry failures."
        action={
          allowed ? (
            <Button
              disabled={!bootstrap.user.mfa}
              onClick={() => setCreate(true)}
            >
              <Plus size={15} />
              Add endpoint
            </Button>
          ) : undefined
        }
      />
      {!bootstrap.user.mfa && allowed && <MfaNeeded />}
      <Panel
        title={`${environment === "SANDBOX" ? "Sandbox" : "Live"} endpoints`}
        description="HTTPS endpoints are checked against public network addresses."
      >
        {resource.error ? (
          <ErrorState error={resource.error} retry={resource.retry} />
        ) : resource.loading ? (
          <Loading />
        ) : resource.data?.items.length ? (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>ENDPOINT</th>
                  <th>STATUS</th>
                  <th>EVENTS</th>
                  <th>DELIVERIES</th>
                  <th>CREATED</th>
                  <th>
                    <span className="sr-only">Open endpoint</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {resource.data.items.map((endpoint) => (
                  <tr key={endpoint.id}>
                    <td>
                      <Link
                        href={link(
                          `/dashboard/developers/webhooks/${endpoint.id}`,
                        )}
                      >
                        {endpoint.description}
                        <small>{endpoint.url}</small>
                      </Link>
                    </td>
                    <td>
                      <Status
                        value={endpoint.disabledAt ? "DISABLED" : "ACTIVE"}
                      />
                    </td>
                    <td>{endpoint.events.length} subscribed</td>
                    <td>{endpoint._count.deliveries}</td>
                    <td>{date(endpoint.createdAt)}</td>
                    <td>
                      <Link
                        href={link(
                          `/dashboard/developers/webhooks/${endpoint.id}`,
                        )}
                        aria-label={`View ${endpoint.description}`}
                      >
                        <ArrowUpRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Bring updates to your application"
            description="Add your HTTPS receiver, save its signing secret, then send a test event to confirm the connection."
            action={
              <Link className="console-button secondary" href="/docs/webhooks">
                Webhook guide
                <ArrowUpRight size={14} />
              </Link>
            }
          />
        )}
      </Panel>
      {create && (
        <Dialog
          title="Connect a webhook endpoint"
          description="Your server should acknowledge valid events with a 2xx response."
          onClose={() => setCreate(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const values = new FormData(e.currentTarget);
              try {
                const result = await api<{ secret: string }>("webhooks", {
                  method: "POST",
                  body: {
                    environment,
                    description: values.get("description"),
                    url: values.get("url"),
                    events: values.getAll("events"),
                    securityCode: values.get("securityCode"),
                  },
                });
                setSecret(result.secret);
                setCreate(false);
                invalidate();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to create endpoint.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Endpoint name">
              <input
                name="description"
                required
                minLength={2}
                maxLength={100}
                placeholder="Customer verification events"
              />
            </Field>
            <Field
              label="Endpoint URL"
              hint="Use a public HTTPS endpoint on port 443 without a query string."
            >
              <input
                name="url"
                type="url"
                required
                maxLength={500}
                placeholder="https://api.yourcompany.com/webhooks/nillar"
              />
            </Field>
            <p className="console-help">Subscribe to events</p>
            <div className="console-event-options">
              {eventTypes.map((type) => (
                <label className="console-check" key={type}>
                  <input
                    name="events"
                    value={type}
                    type="checkbox"
                    defaultChecked
                  />
                  <span className="console-mono">{type}</span>
                </label>
              ))}
            </div>
            <StepUpField />
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreate(false)}
              >
                Cancel
              </Button>
              <Button busy={busy}>
                Connect endpoint
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {secret && (
        <SecretDialog
          title="Save your webhook signing secret."
          value={secret}
          onClose={() => setSecret("")}
        />
      )}
    </>
  );
}
export function DeliveryTable({
  items,
  onRetry,
  busy = false,
}: {
  items: Delivery[];
  onRetry?: (id: string) => void;
  busy?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <div className="console-table-wrap">
        <table className="console-table">
          <thead>
            <tr>
              <th>EVENT</th>
              <th>DELIVERY STATUS</th>
              <th>HTTP</th>
              <th>ATTEMPTS</th>
              <th>CREATED</th>
              <th>
                <span className="sr-only">Retry delivery</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <button
                    type="button"
                    className="console-inline-link"
                    onClick={() => setSelected(item.id)}
                  >
                    {item.event.type}
                  </button>
                  <small className="mono">{item.id.slice(0, 8)}…</small>
                </td>
                <td>
                  <Status value={item.status} />
                  {item.lastErrorCode && (
                    <small>
                      {item.lastErrorCode.toLowerCase().replaceAll("_", " ")}
                    </small>
                  )}
                </td>
                <td>{item.responseStatus || "—"}</td>
                <td>{item.attempts}</td>
                <td>{date(item.createdAt, true)}</td>
                <td>
                  {item.status === "FAILED" && onRetry && (
                    <Button
                      variant="secondary"
                      className="compact"
                      disabled={busy}
                      onClick={() => onRetry(item.id)}
                    >
                      <RefreshCw size={12} />
                      Retry
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <DeliveryDetails id={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
function DeliveryDetails({ id, onClose }: { id: string; onClose: () => void }) {
  const resource = useResource<{
    delivery: Delivery & {
      nextAttemptAt: string;
      totalAttempts: number;
      event: { type: string; payload: Record<string, unknown> };
      history: {
        id: string;
        attemptNumber: number;
        responseStatus: number | null;
        errorCode: string | null;
        durationMs: number;
        createdAt: string;
      }[];
    };
  }>(`deliveries/${id}`);
  const value = resource.data?.delivery;
  return (
    <Dialog title="Delivery details" description={id} onClose={onClose}>
      {resource.error ? (
        <ErrorState error={resource.error} retry={resource.retry} />
      ) : !value ? (
        <Loading />
      ) : (
        <>
          <dl className="console-properties">
            <div>
              <dt>Endpoint</dt>
              <dd>{value.endpoint?.url}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Status value={value.status} />
              </dd>
            </div>
            <div>
              <dt>Event ID</dt>
              <dd className="console-mono">{value.eventId}</dd>
            </div>
            <div>
              <dt>Total attempts</dt>
              <dd>{value.totalAttempts}</dd>
            </div>
            {value.status === "PENDING" && (
              <div>
                <dt>Next attempt</dt>
                <dd>{date(value.nextAttemptAt, true)}</dd>
              </div>
            )}
          </dl>
          <h3 className="console-margin-top">Attempt history</h3>
          {value.history.length ? (
            <div className="console-table-wrap">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>Attempt</th>
                    <th>Result</th>
                    <th>Duration</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {value.history.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>{attempt.attemptNumber}</td>
                      <td>
                        {attempt.responseStatus ||
                          attempt.errorCode ||
                          "Unavailable"}
                      </td>
                      <td>{attempt.durationMs} ms</td>
                      <td>{date(attempt.createdAt, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="console-form-note">
              The worker has not attempted this delivery yet.
            </p>
          )}
          <details className="console-advanced">
            <summary>Event payload</summary>
            <pre className="console-code">
              {JSON.stringify(value.event.payload, null, 2)}
            </pre>
          </details>
        </>
      )}
    </Dialog>
  );
}
export function WebhookDetail({ id }: { id: string }) {
  const { workspace, api, invalidate } = useConsole(),
    resource = useResource<{ endpoint: Endpoint; deliveries: Delivery[] }>(
      `webhooks/${id}`,
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState<"rotate" | "toggle" | null>(null),
    [secret, setSecret] = useState("");
  const endpoint = resource.data?.endpoint,
    allowed = workspace && may(workspace.role, "develop");
  if (resource.error)
    return <ErrorState error={resource.error} retry={resource.retry} />;
  if (!endpoint) return <Loading />;
  const retry = async (deliveryId: string) => {
    setBusy(true);
    setError("");
    try {
      await api(`deliveries/${deliveryId}/retry`, { method: "POST" });
      setMessage(
        "Delivery queued for retry. The worker will process it on its next run.",
      );
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to queue retry.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHeading
        eyebrow="WEBHOOK ENDPOINT"
        title={endpoint.description}
        description={endpoint.url}
        action={
          <Button variant="secondary" onClick={invalidate}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <div className="console-detail-grid">
        <Panel
          title="Connection details"
          action={
            <Status value={endpoint.disabledAt ? "DISABLED" : "ACTIVE"} />
          }
        >
          <dl className="console-properties">
            {[
              ["Endpoint ID", endpoint.id],
              ["Environment", endpoint.environment],
              ["Created", date(endpoint.createdAt)],
              ["Secret version", String(endpoint.secretVersion)],
            ].map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd className="console-mono">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="console-panel-body">
            <p className="console-help">Subscribed events</p>
            <div className="console-tag-list">
              {endpoint.events.map((type) => (
                <span className="console-tag" key={type}>
                  {type}
                </span>
              ))}
            </div>
          </div>
          {allowed && (
            <div className="console-detail-actions">
              <Button
                busy={busy}
                disabled={Boolean(endpoint.disabledAt)}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api(`webhooks/${id}/test`, { method: "POST" });
                    setMessage(
                      "Signed test event queued. Check delivery history after the worker’s next scheduled run.",
                    );
                    invalidate();
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Unable to queue test event.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Send test event
              </Button>
              <Button variant="secondary" onClick={() => setConfirm("rotate")}>
                Rotate secret
              </Button>
              <Button variant="quiet" onClick={() => setConfirm("toggle")}>
                {endpoint.disabledAt ? "Enable endpoint" : "Disable endpoint"}
              </Button>
            </div>
          )}
        </Panel>
        <div className="console-note-card">
          <Webhook size={22} />
          <h2>Acknowledge first. Process safely.</h2>
          <p>
            Verify the timestamp and signature against the untouched request
            body. Store event IDs so repeated deliveries are handled once.
          </p>
          <p>
            Delivery is at least once. Pending events are processed by the
            scheduled worker, with up to eight attempts and bounded backoff.
          </p>
          <Link className="console-inline-link" href="/docs/webhooks">
            Verify your webhook signatures
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <Panel
        title="Recent deliveries"
        description="The 25 most recent events delivered to this endpoint."
        className="console-margin-top"
      >
        {resource.data!.deliveries.length ? (
          <DeliveryTable
            items={resource.data!.deliveries}
            busy={busy}
            onRetry={allowed ? (id) => void retry(id) : undefined}
          />
        ) : (
          <Empty
            title="No deliveries recorded"
            description="Send a test event or create a verification subscribed to this endpoint."
          />
        )}
      </Panel>
      {confirm && (
        <Dialog
          title={
            confirm === "rotate"
              ? "Rotate the signing secret?"
              : endpoint.disabledAt
                ? "Enable this endpoint?"
                : "Disable this endpoint?"
          }
          description={
            confirm === "rotate"
              ? "Your receiver must use the new secret for future deliveries, including retries. Save the replacement before closing."
              : "Confirm the endpoint change with your authenticator."
          }
          onClose={() => setConfirm(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await api<{ secret?: string }>(
                  `webhooks/${id}/${confirm}`,
                  {
                    method: "POST",
                    body: {
                      securityCode: new FormData(e.currentTarget).get(
                        "securityCode",
                      ),
                      ...(confirm === "toggle"
                        ? { enabled: Boolean(endpoint.disabledAt) }
                        : {}),
                    },
                  },
                );
                if (result.secret) setSecret(result.secret);
                setConfirm(null);
                invalidate();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to change endpoint.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <StepUpField />
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirm(null)}
              >
                Cancel
              </Button>
              <Button busy={busy}>Confirm change</Button>
            </div>
          </form>
        </Dialog>
      )}
      {secret && (
        <SecretDialog
          title="Save the replacement signing secret."
          value={secret}
          onClose={() => setSecret("")}
        />
      )}
    </>
  );
}
export function Deliveries() {
  const { workspace, api, invalidate } = useConsole(),
    [history, setHistory] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    cursor = history.at(-1),
    resource = useResource<PageResult<Delivery>>(
      `deliveries${cursor ? "?cursor=" + cursor : ""}`,
    ),
    allowed = workspace && may(workspace.role, "develop");
  return (
    <>
      <PageHeading
        title="Webhook deliveries"
        description="A visible record of delivery outcomes, response codes and retries."
        action={
          <Button variant="secondary" onClick={invalidate}>
            <RefreshCw size={14} />
            Refresh
          </Button>
        }
      />
      {message && <Notice>{message}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <Panel>
        {resource.error ? (
          <ErrorState error={resource.error} retry={resource.retry} />
        ) : resource.loading ? (
          <Loading />
        ) : resource.data?.items.length ? (
          <>
            <DeliveryTable
              items={resource.data.items}
              busy={busy}
              onRetry={
                allowed
                  ? async (id) => {
                      setBusy(true);
                      setError("");
                      try {
                        await api(`deliveries/${id}/retry`, { method: "POST" });
                        setMessage(
                          "The failed delivery has been queued for retry.",
                        );
                        invalidate();
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Unable to retry.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }
                  : undefined
              }
            />
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
            title="Your delivery history starts with an event"
            description="Connect a webhook endpoint and send a test event. The delivery worker will record its result here."
          />
        )}
      </Panel>
    </>
  );
}
