"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Clock3,
  Code2,
  FileCheck2,
  FlaskConical,
  Plus,
  ShieldCheck,
  Users,
  Webhook,
} from "lucide-react";
import type { Summary, Usage, Verification } from "@/lib/console/contracts";
import { may } from "@/lib/console/contracts";
import { useConsole, useResource } from "./context";
import {
  count,
  date,
  Empty,
  ErrorState,
  Loading,
  PageHeading,
  Panel,
  Status,
} from "./ui";
export function VerificationTable({ items }: { items: Verification[] }) {
  const { link } = useConsole();
  return (
    <div className="console-table-wrap">
      <table className="console-table">
        <thead>
          <tr>
            <th>REFERENCE</th>
            <th>CUSTOMER</th>
            <th>STATUS</th>
            <th>CREATED</th>
            <th>
              <span className="sr-only">Open verification</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={link(`/dashboard/verifications/${item.id}`)}>
                  {item.reference}
                  <small className="mono">{item.id.slice(0, 8)}…</small>
                </Link>
              </td>
              <td>{item.customerReference || "—"}</td>
              <td>
                <Status value={item.status} />
              </td>
              <td>{date(item.createdAt)}</td>
              <td>
                <Link
                  href={link(`/dashboard/verifications/${item.id}`)}
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
  );
}
export function ActivityChart({
  data,
  days = 7,
}: {
  data: Usage["daily"];
  days?: number;
}) {
  const daily = Array.from({ length: days }, (_, i) => {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() - (days - 1 - i));
      const key = day.toISOString().slice(0, 10);
      return {
        day: key,
        total: data.find((item) => item.day.slice(0, 10) === key)?.total || 0,
      };
    }),
    series =
      days <= 30
        ? daily
        : Array.from({ length: Math.ceil(days / 7) }, (_, i) => ({
            day: daily[i * 7].day,
            total: daily
              .slice(i * 7, i * 7 + 7)
              .reduce((sum, day) => sum + day.total, 0),
          })),
    max = Math.max(1, ...series.map((day) => day.total));
  return (
    <>
      <div
        className={`console-bar-chart ${days > 7 ? "dense" : ""}`}
        role="img"
        aria-label={`Verification activity ${days > 30 ? "by week starting" : "by day"}: ${series.map((day) => `${day.day}: ${day.total}`).join(", ")}`}
      >
        {series.map((day, i) => (
          <div
            key={day.day}
            title={`${days > 30 ? "Week starting " : ""}${day.day}: ${count(day.total)} verifications`}
          >
            <div
              className="bar"
              style={{
                height: `${Math.max(1, (day.total / max) * 100)}%`,
                opacity: day.total ? 1 : 0.12,
              }}
            />
            <span className="bar-label">
              {days <= 7
                ? new Intl.DateTimeFormat("en", {
                    weekday: "short",
                    timeZone: "UTC",
                  }).format(new Date(day.day))
                : i % (series.length > 14 ? 5 : 2) === 0
                  ? day.day.slice(8)
                  : ""}
            </span>
          </div>
        ))}
      </div>
      <p className="console-chart-caption">
        {data.reduce((sum, day) => sum + day.total, 0)
          ? `Created verifications · UTC calendar ${days > 30 ? "weeks" : "days"}`
          : "Your activity will appear here when you create your first verification."}
      </p>
    </>
  );
}
export const setupSteps = [
  [
    "email",
    "Verify your work email",
    "Confirm the address used for your client account.",
    "/dashboard/setup",
  ],
  [
    "profile",
    "Tell us about your organisation",
    "Your business, use case and privacy notice.",
    "/dashboard/settings",
  ],
  [
    "mfa",
    "Secure your account",
    "Connect your authenticator and save recovery codes.",
    "/dashboard/settings/security",
  ],
  [
    "apiKey",
    "Create a sandbox API key",
    "Use scoped credentials from your server.",
    "/dashboard/developers/keys",
  ],
  [
    "testVerification",
    "Run your first verification",
    "Walk through a clearly marked sandbox outcome.",
    "/dashboard/developers/playground",
  ],
  [
    "webhook",
    "Connect a webhook endpoint",
    "Receive updates at your HTTPS endpoint.",
    "/dashboard/developers/webhooks",
  ],
  [
    "webhookDelivered",
    "Receive a signed webhook",
    "Confirm delivery before requesting live access.",
    "/dashboard/developers/deliveries",
  ],
] as const;
export function SetupChecklist({
  summary,
  full = false,
}: {
  summary: Summary;
  full?: boolean;
}) {
  const { link } = useConsole(),
    done = setupSteps.filter(([key]) => summary.setup[key]).length,
    items = full
      ? setupSteps
      : setupSteps.filter(([key]) => !summary.setup[key]).slice(0, 3);
  return (
    <Panel
      title={
        done === 7 ? "Your sandbox is connected" : "A clear path to going live"
      }
      description={`${done} of 7 setup steps complete`}
      action={
        <span className="console-mono">{Math.round((done / 7) * 100)}%</span>
      }
    >
      <div className="console-panel-body" style={{ paddingBottom: 13 }}>
        <div className="console-progress">
          <span style={{ width: `${(done / 7) * 100}%` }} />
        </div>
      </div>
      {items.map(([key, title, description, path], index) => (
        <div className="console-setup-row" key={key}>
          <span
            className={`console-step-icon ${summary.setup[key] ? "done" : ""}`}
          >
            {summary.setup[key] ? <Check size={12} /> : index + 1}
          </span>
          <div>
            <strong>{title}</strong>
            {full && <p>{description}</p>}
          </div>
          <Link
            className="console-button quiet compact"
            href={link(path)}
            aria-label={title}
          >
            <ArrowUpRight size={14} />
          </Link>
        </div>
      ))}
      {!full && (
        <div className="console-panel-body" style={{ paddingTop: 16 }}>
          <Link className="console-inline-link" href={link("/dashboard/setup")}>
            View setup checklist
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </Panel>
  );
}
export function Overview() {
  const { workspace, environment, link } = useConsole(),
    summary = useResource<Summary>("summary"),
    usage = useResource<Usage>("usage?days=7");
  if (summary.error)
    return <ErrorState error={summary.error} retry={summary.retry} />;
  if (!summary.data) return <Loading />;
  const data = summary.data,
    total = data.counts.reduce((sum, item) => sum + item.count, 0),
    verified =
      data.counts.find((item) => item.status === "VERIFIED")?.count || 0,
    review = data.counts
      .filter((item) =>
        ["REVIEW_REQUIRED", "ACTION_REQUIRED"].includes(item.status),
      )
      .reduce((sum, item) => sum + item.count, 0);
  return (
    <>
      <PageHeading
        eyebrow={workspace?.name.toUpperCase()}
        title="Your verification workspace."
        description="A clear view of your customers, checks and next steps."
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
      <div className="console-metrics">
        {[
          [
            FileCheck2,
            "Total verifications",
            total,
            `${environment === "SANDBOX" ? "Sandbox" : "Live"} environment`,
          ],
          [
            CheckCheck,
            "Verified",
            verified,
            total
              ? `${Math.round((verified / total) * 100)}% of verifications`
              : "No completed checks yet",
          ],
          [
            Clock3,
            "Needs attention",
            review,
            "Review or customer action required",
          ],
          [Users, "Customers", data.customers, "Unique customer references"],
        ].map(([Icon, label, value, detail]) => {
          const MetricIcon = Icon as typeof FileCheck2;
          return (
            <div className="console-metric" key={String(label)}>
              <span className="console-metric-label">
                {String(label)}
                <MetricIcon size={15} />
              </span>
              <strong>{count(Number(value))}</strong>
              <small>{String(detail)}</small>
            </div>
          );
        })}
      </div>
      <div className="console-grid">
        <div className="console-stack">
          <Panel
            title="Verification activity"
            description="A little perspective on the last seven days."
            action={
              <Link
                className="console-inline-link"
                href={link("/dashboard/usage")}
              >
                View usage
                <ArrowUpRight size={13} />
              </Link>
            }
          >
            {usage.data ? (
              <ActivityChart data={usage.data.daily} />
            ) : usage.error ? (
              <div className="console-panel-body">
                <p className="console-help">
                  Activity is temporarily unavailable.
                </p>
              </div>
            ) : (
              <Loading />
            )}
          </Panel>
          <Panel
            title="Recent verifications"
            action={
              <Link
                className="console-inline-link"
                href={link("/dashboard/verifications")}
              >
                View all
                <ArrowRight size={13} />
              </Link>
            }
          >
            {data.recent.length ? (
              <VerificationTable items={data.recent} />
            ) : (
              <Empty
                title="Your first verification starts here"
                description="Create a hosted session or try a sandbox outcome. Your customers’ real identity information stays outside this workspace."
                action={
                  <Link
                    className="console-button secondary"
                    href={link("/dashboard/developers/playground")}
                  >
                    <FlaskConical size={14} />
                    Try the sandbox
                  </Link>
                }
              />
            )}
          </Panel>
        </div>
        <div className="console-stack">
          <SetupChecklist summary={data} />
          <div className="console-note-card">
            <ShieldCheck size={22} />
            <h2>Ready for real customers?</h2>
            <p>
              Connect your integration in sandbox, confirm your business details
              and request a production review.
            </p>
            <Link
              className="console-inline-link"
              href={link("/dashboard/compliance")}
            >
              Review live requirements
              <ArrowRight size={14} />
            </Link>
          </div>
          <Panel title="This month">
            <div className="console-usage-summary">
              <p className="console-summary-number">
                {count(data.monthUsage)}
                <span
                  style={{
                    fontSize: 13,
                    letterSpacing: 0,
                    color: "#626259",
                    marginLeft: 7,
                  }}
                >
                  / {count(data.monthlyLimit)}
                </span>
              </p>
              <p>Verification sessions created</p>
              <div className="console-progress">
                <span
                  style={{
                    width: `${Math.min(100, (data.monthUsage / data.monthlyLimit) * 100)}%`,
                  }}
                />
              </div>
              <Link
                className="console-inline-link"
                href={link("/dashboard/usage")}
                style={{ marginTop: 14 }}
              >
                Usage details
                <ArrowRight size={13} />
              </Link>
            </div>
          </Panel>
        </div>
      </div>
      <div className="console-feature-links">
        <Link href="/docs/quickstart">
          <Code2 size={20} />
          <h3>From your first request to production.</h3>
          <p>
            Clear examples, scoped credentials and an API designed for your
            server.
          </p>
        </Link>
        <Link href={link("/dashboard/developers/webhooks")}>
          <Webhook size={20} />
          <h3>Stay in sync as checks progress.</h3>
          <p>Signed events, delivery history and retries you can inspect.</p>
        </Link>
        <Link href={link("/dashboard/settings/team")}>
          <Users size={20} />
          <h3>The right access for every role.</h3>
          <p>
            Invite your developers, analysts and operations team to one
            workspace.
          </p>
        </Link>
      </div>
    </>
  );
}
