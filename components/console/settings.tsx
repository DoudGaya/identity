"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  KeyRound,
  LifeBuoy,
  Mail,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { consoleRequest } from "@/lib/console/client";
import { may, type Role } from "@/lib/console/contracts";
import { useConsole, useResource } from "./context";
import { WorkspaceForm } from "./setup";
import { AccountSessions } from "./account-sessions";
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
  Panel,
  Status,
  StepUpField,
} from "./ui";
type Member = {
  id: string;
  userId: string;
  role: Role;
  name: string;
  email: string;
  mfa: boolean;
  createdAt: string;
};
type Invite = {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
  createdAt: string;
};
export function WorkspaceSettings() {
  const { workspace, link } = useConsole();
  if (!workspace) return null;
  return (
    <>
      <PageHeading
        title="Workspace settings"
        description="Your organisation’s details, customer contact and approved return destinations."
      />
      {may(workspace.role, "manage") ? (
        <Panel key={workspace.id + workspace.name}>
          <WorkspaceForm existing={workspace} />
        </Panel>
      ) : (
        <Panel title="Organisation profile">
          <dl className="console-properties">
            {[
              ["Name", workspace.name],
              ["Website", workspace.website],
              ["Privacy notice", workspace.privacyUrl],
              ["Support email", workspace.supportEmail],
              ["Your access", workspace.role.toLowerCase()],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="console-panel-body">
            <Notice>An owner or admin can update workspace details.</Notice>
          </div>
        </Panel>
      )}
      <Link
        className="console-inline-link"
        href={link("/dashboard/settings/verification")}
        style={{ marginTop: 24 }}
      >
        View verification policies and retention settings
        <ArrowRight size={14} />
      </Link>
    </>
  );
}
export function Team() {
  const { workspace, bootstrap, api, invalidate } = useConsole(),
    resource = useResource<{ members: Member[]; invitations: Invite[] }>(
      "members",
    ),
    [invite, setInvite] = useState(false),
    [selected, setSelected] = useState<Member | Invite | null>(null),
    [action, setAction] = useState<"member" | "revoke">("member"),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const manage = workspace && may(workspace.role, "manage");
  return (
    <>
      <PageHeading
        title="Good work takes a team."
        description="Give each person the access they need, with a clear record of invitations and role changes."
        action={
          manage ? (
            <Button
              disabled={!bootstrap.user.mfa}
              onClick={() => {
                setError("");
                setInvite(true);
              }}
            >
              <Plus size={15} />
              Invite team member
            </Button>
          ) : undefined
        }
      />
      {manage && !bootstrap.user.mfa && (
        <Notice>
          Set up two-factor authentication in Security before managing team
          access.
        </Notice>
      )}
      {resource.error ? (
        <ErrorState error={resource.error} retry={resource.retry} />
      ) : resource.loading ? (
        <Loading />
      ) : (
        <div className="console-stack">
          <Panel
            title="Workspace members"
            description="Owners control team role changes. Every member uses their own Nillar account."
          >
            <div className="console-table-wrap">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>PERSON</th>
                    <th>ROLE</th>
                    <th>AUTHENTICATOR</th>
                    <th>JOINED</th>
                    <th>
                      <span className="sr-only">Manage member</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data?.members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        {member.name || member.email}
                        {member.userId === bootstrap.user.id && " · You"}
                        <small>{member.email}</small>
                      </td>
                      <td>
                        <Status value={member.role} />
                      </td>
                      <td>
                        <Status
                          value={member.mfa ? "ENABLED" : "NOT_ENABLED"}
                        />
                      </td>
                      <td>{date(member.createdAt)}</td>
                      <td>
                        {workspace?.role === "OWNER" &&
                          member.role !== "OWNER" &&
                          member.userId !== bootstrap.user.id && (
                            <Button
                              variant="quiet"
                              className="compact"
                              onClick={() => {
                                setSelected(member);
                                setAction("member");
                                setError("");
                              }}
                            >
                              Manage
                            </Button>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel
            title="Pending invitations"
            description="Invitation links expire after seven days and can be accepted once, using the invited, verified email."
          >
            {resource.data?.invitations.length ? (
              <div className="console-table-wrap">
                <table className="console-table">
                  <thead>
                    <tr>
                      <th>EMAIL</th>
                      <th>ROLE</th>
                      <th>EXPIRES</th>
                      <th>
                        <span className="sr-only">Revoke invitation</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resource.data.invitations.map((item) => (
                      <tr key={item.id}>
                        <td>{item.email}</td>
                        <td>{item.role.toLowerCase()}</td>
                        <td>{date(item.expiresAt)}</td>
                        <td>
                          {manage && (
                            <Button
                              variant="quiet"
                              className="compact"
                              onClick={() => {
                                setSelected(item);
                                setAction("revoke");
                                setError("");
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
                title="No invitations waiting"
                description="Invite your developers, analysts and operations team when you’re ready."
              />
            )}
          </Panel>
        </div>
      )}
      {invite && (
        <Dialog
          title="Make room for your team."
          description="Create a private invitation link, then share it securely with the person you invite."
          onClose={() => setInvite(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const values = new FormData(e.currentTarget);
              try {
                const result = await api<{ invitationUrl: string }>(
                  "invitations",
                  {
                    method: "POST",
                    body: {
                      email: values.get("email"),
                      role: values.get("role"),
                      securityCode: values.get("securityCode"),
                    },
                  },
                );
                setUrl(result.invitationUrl);
                setInvite(false);
                invalidate();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to create invitation.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Work email">
              <input name="email" type="email" required maxLength={254} />
            </Field>
            <Field label="Workspace role">
              <select name="role" defaultValue="DEVELOPER">
                <option value="ADMIN">
                  Admin · settings, integrations and invitations
                </option>
                <option value="DEVELOPER">
                  Developer · API keys, webhooks and verifications
                </option>
                <option value="ANALYST">
                  Analyst · create and monitor verifications
                </option>
                <option value="VIEWER">
                  Viewer · read-only workspace access
                </option>
              </select>
            </Field>
            <StepUpField />
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setInvite(false)}
              >
                Cancel
              </Button>
              <Button busy={busy}>
                Create invitation
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {url && (
        <Dialog
          title="Your invitation link is ready."
          description="Share it with the invited person. It has not been emailed automatically."
          onClose={() => setUrl("")}
        >
          <div className="console-secret">
            <code>{url}</code>
            <CopyButton value={url} label="Copy invitation link" />
          </div>
          <div className="console-form-actions">
            <Button onClick={() => setUrl("")}>
              Done
              <Check size={14} />
            </Button>
          </div>
        </Dialog>
      )}
      {selected && (
        <Dialog
          title={
            action === "member"
              ? "Manage workspace access"
              : "Revoke this invitation?"
          }
          description={selected.email}
          onClose={() => setSelected(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const values = new FormData(e.currentTarget),
                role = String(values.get("role"));
              try {
                await api(
                  action === "member"
                    ? `members/${selected.id}`
                    : `invitations/${selected.id}/revoke`,
                  {
                    method: action === "member" ? "PATCH" : "POST",
                    body: {
                      securityCode: values.get("securityCode"),
                      ...(action === "member"
                        ? role === "REMOVE"
                          ? { remove: true }
                          : { role }
                        : {}),
                    },
                  },
                );
                setSelected(null);
                invalidate();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Unable to update access.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {action === "member" && (
              <>
                <Field label="Role">
                  <select name="role" defaultValue={selected.role}>
                    <option value="ADMIN">Admin</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="ANALYST">Analyst</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="REMOVE">Remove member from workspace</option>
                  </select>
                </Field>
                <Notice>
                  Removing developer access also revokes API keys issued by this
                  member. Their Nillar account stays separate from workspace
                  access.
                </Notice>
              </>
            )}
            <StepUpField />
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected(null)}
              >
                Back
              </Button>
              <Button
                busy={busy}
                variant={action === "revoke" ? "danger" : "primary"}
              >
                {action === "revoke" ? "Revoke invitation" : "Update access"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
export function Security() {
  const { bootstrap, reload } = useConsole(),
    [open, setOpen] = useState(false),
    [setup, setSetup] = useState<{ manualKey: string; qrCode: string } | null>(
      null,
    ),
    [recovery, setRecovery] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const close = () => {
    setOpen(false);
    setSetup(null);
    setRecovery([]);
    setError("");
  };
  return (
    <>
      <PageHeading
        title="Secure by habit. Protected by design."
        description="Keep your Nillar account protected before connecting production systems."
      />
      <div className="console-detail-grid">
        <div className="console-stack">
          <Panel
            title="Two-factor authentication"
            action={
              <Status value={bootstrap.user.mfa ? "ENABLED" : "NOT_ENABLED"} />
            }
          >
            <div className="console-panel-body">
              <p className="console-form-note">
                Use an authenticator app in addition to your account password.
                Sensitive workspace changes also require a current authenticator
                code.
              </p>
              {bootstrap.user.mfa ? (
                <Notice>
                  <Check size={14} /> Your Nillar account has two-factor
                  authentication enabled.
                </Notice>
              ) : (
                <Button onClick={() => setOpen(true)}>
                  <ShieldCheck size={15} />
                  Set up authenticator
                </Button>
              )}
            </div>
          </Panel>
          <AccountSessions />
          <Panel title="Your account">
            <dl className="console-properties">
              <div>
                <dt>Email</dt>
                <dd>{bootstrap.user.email}</dd>
              </div>
              <div>
                <dt>Work email verification</dt>
                <dd>
                  <Status
                    value={
                      bootstrap.user.emailVerified ? "VERIFIED" : "PENDING"
                    }
                  />
                </dd>
              </div>
              <div>
                <dt>Session storage</dt>
                <dd>Secure, HttpOnly cookies</dd>
              </div>
            </dl>
            <div className="console-panel-body">
              <p className="console-form-note">
                Account passwords and recovery are shared with your Nillar
                account. Identity data and API credentials are never saved in
                browser local storage.
              </p>
              <Link className="console-inline-link" href="/forgot-password">
                Recover your account password
                <ArrowRight size={14} />
              </Link>
            </div>
          </Panel>
        </div>
        <div className="console-note-card" style={{ alignSelf: "start" }}>
          <KeyRound size={22} />
          <h2>Keep a way back in.</h2>
          <p>
            After you connect your authenticator, save the recovery codes in a
            secure place. Each code can be used once if your authenticator is
            unavailable.
          </p>
          <p>
            Nillar support will never ask you to share your password, API key or
            authenticator code.
          </p>
          <Link className="console-inline-link" href="/docs/security">
            Integration security guide
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      {open && (
        <Dialog
          title={
            recovery.length
              ? "Save your recovery codes."
              : setup
                ? "Connect your authenticator."
                : "Confirm it’s you."
          }
          description={
            recovery.length
              ? "These codes are shown once. Keep them somewhere secure, separate from your authenticator."
              : setup
                ? "Scan the QR code or enter the setup key in your authenticator app, then confirm its six-digit code."
                : "Enter your current account password to start authenticator setup."
          }
          onClose={close}
        >
          {recovery.length ? (
            <>
              <div className="console-recovery-codes">
                {recovery.map((code) => (
                  <code key={code}>{code}</code>
                ))}
              </div>
              <CopyButton
                value={recovery.join("\n")}
                label="Copy recovery codes"
              />
              <div className="console-form-actions">
                <Button onClick={close}>
                  I’ve saved the codes
                  <Check size={14} />
                </Button>
              </div>
            </>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                const form = e.currentTarget,
                  values = new FormData(form);
                try {
                  if (setup) {
                    const result = await consoleRequest<{
                      recoveryCodes: string[];
                    }>("security/enable", {
                      method: "POST",
                      body: { code: values.get("code") },
                    });
                    setRecovery(result.recoveryCodes);
                    setSetup(null);
                    await reload();
                  } else {
                    const result = await consoleRequest<{
                      manualKey: string;
                      qrCode: string;
                    }>("security/setup", {
                      method: "POST",
                      body: { password: values.get("password") },
                    });
                    form.reset();
                    setSetup(result);
                  }
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Unable to update account security.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {setup ? (
                <>
                  <Image
                    className="console-security-qr"
                    src={setup.qrCode}
                    width={180}
                    height={180}
                    alt="Authenticator setup QR code"
                    unoptimized
                  />
                  <Field label="Manual setup key">
                    <div className="console-secret">
                      <code>{setup.manualKey}</code>
                      <CopyButton
                        value={setup.manualKey}
                        label="Copy setup key"
                      />
                    </div>
                  </Field>
                  <Field label="Authenticator code">
                    <input
                      name="code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      autoComplete="one-time-code"
                      required
                    />
                  </Field>
                </>
              ) : (
                <Field label="Current password">
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    minLength={6}
                    maxLength={256}
                    required
                  />
                </Field>
              )}
              {error && <Notice error>{error}</Notice>}
              <div className="console-form-actions">
                <Button type="button" variant="secondary" onClick={close}>
                  Back
                </Button>
                <Button busy={busy}>
                  {setup ? "Enable authenticator" : "Continue"}
                  <ArrowRight size={14} />
                </Button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
type Policy = {
  code: string;
  version: number;
  requiredChecks: unknown;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
};
export function VerificationSettings() {
  const { workspace, link } = useConsole(),
    resource = useResource<{
      policies: Policy[];
      retention: { days: number; mode: string };
    }>("policies");
  return (
    <>
      <PageHeading
        title="Verification settings"
        description="Know what each policy requires and how retention is reviewed for your workspace."
      />
      {resource.error ? (
        <ErrorState error={resource.error} retry={resource.retry} />
      ) : !resource.data ? (
        <Loading />
      ) : (
        <div className="console-stack">
          <Panel
            title="Available live policies"
            description="Requirements are controlled by the verification service and cannot be reduced by a client integration."
          >
            {resource.data.policies.length ? (
              resource.data.policies.map((policy) => (
                <div
                  className="console-form-section"
                  key={policy.code + policy.version}
                >
                  <h3>
                    {policy.code === "BUSINESS_P0"
                      ? "Business identity"
                      : "Personal identity"}{" "}
                    · Version {policy.version}
                  </h3>
                  <p>Effective {date(policy.effectiveFrom)}</p>
                  <pre className="console-code">
                    {JSON.stringify(policy.requiredChecks, null, 2)}
                  </pre>
                </div>
              ))
            ) : (
              <Empty
                title="Live policies are awaiting activation"
                description="Sandbox simulations are available independently. Live sessions require an active, approved policy."
              />
            )}
          </Panel>
          <Panel title="Retention review">
            <div className="console-panel-body">
              <p className="console-summary-number">
                {resource.data.retention.days}
                <span style={{ fontSize: 14, letterSpacing: 0, marginLeft: 6 }}>
                  days
                </span>
              </p>
              <p className="console-form-note">
                This is the workspace’s configured review period. Evidence is
                not automatically deleted by this setting. Retention reporting
                and legal holds remain part of the authorised operations
                process.
              </p>
              <Link
                className="console-inline-link"
                href={link("/dashboard/settings")}
              >
                Manage workspace settings
                <ArrowRight size={14} />
              </Link>
            </div>
          </Panel>
          <Panel title="Customer consent & destinations">
            <dl className="console-properties">
              <div>
                <dt>Privacy notice</dt>
                <dd>{workspace?.privacyUrl || "Not configured"}</dd>
              </div>
              <div>
                <dt>Customer contact</dt>
                <dd>{workspace?.supportEmail || "Not configured"}</dd>
              </div>
              <div>
                <dt>Return origins</dt>
                <dd>
                  {workspace?.returnOrigins.length
                    ? workspace.returnOrigins.join(", ")
                    : "No application return origins registered"}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      )}
    </>
  );
}
export function Support() {
  const { workspace, link } = useConsole();
  const subject = encodeURIComponent(
    `Nillar Identity support${workspace ? " · " + workspace.name : ""}`,
  );
  return (
    <>
      <PageHeading
        title="A little help, when you need it."
        description="Find a clear answer, trace an integration issue or speak with Nillar."
      />
      <div className="console-feature-links" style={{ marginTop: 0 }}>
        <Link href="/docs/quickstart">
          <BookOpen size={22} />
          <h3>Developer documentation</h3>
          <p>
            Start with the quickstart, then explore sessions, SDKs, errors and
            signed events.
          </p>
        </Link>
        <Link href={link("/dashboard/developers/requests")}>
          <LifeBuoy size={22} />
          <h3>Trace a request</h3>
          <p>
            Find the response code and request reference before you contact
            support.
          </p>
        </Link>
        <a href={`mailto:support@nillar.com?subject=${subject}`}>
          <Mail size={22} />
          <h3>Speak with Nillar</h3>
          <p>
            support@nillar.com · Include your workspace ID and the request
            reference.
          </p>
        </a>
      </div>
      <Panel
        title="Make your support request easier to resolve"
        className="console-margin-top"
      >
        <div className="console-panel-body">
          <p className="console-form-note">
            Share the workspace ID, sandbox or live environment, approximate
            request time and a request reference. Never send a NIN, BVN,
            document, selfie, password, API key or webhook signing secret.
          </p>
          {workspace && (
            <div className="console-secret">
              <code>{workspace.id}</code>
              <CopyButton value={workspace.id} label="Copy workspace ID" />
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}
