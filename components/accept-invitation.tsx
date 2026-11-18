"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Mail, Users } from "lucide-react";
import { consoleRequest } from "@/lib/console/client";
import { ClientError, csrf } from "@/lib/client";
type Account = { email: string; emailVerified: boolean };
export function AcceptInvitation() {
  const [pending, setPending] = useState(false),
    [account, setAccount] = useState<Account | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [needsLogin, setNeedsLogin] = useState(false),
    [emailSent, setEmailSent] = useState(false),
    [loading, setLoading] = useState(true),
    started = useRef(false),
    router = useRouter();
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    window.history.replaceState(null, "", "/join");
    const prepare = async () => {
      try {
        if (token) {
          if (!/^[A-Za-z0-9_-]{43}$/.test(token))
            throw new Error(
              "Ask your workspace admin for a valid invitation link.",
            );
          const response = await fetch("/api/invitations/pending", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: {
              "content-type": "application/json",
              "x-csrf-token": await csrf(),
            },
            body: JSON.stringify({ token }),
          });
          if (!response.ok)
            throw new Error(
              "This invitation could not be saved securely. Reopen the original link and try again.",
            );
        }
        const saved = await fetch("/api/invitations/pending", {
          cache: "no-store",
          credentials: "same-origin",
        }).then((r) => r.json());
        if (!saved.pending)
          throw new Error(
            "Reopen the original invitation link to continue. No invitation is saved in this browser.",
          );
        setPending(true);
        try {
          const me = await consoleRequest<{ user: Account }>("me");
          setAccount(me.user);
        } catch (e) {
          if (e instanceof ClientError && e.status === 401) setNeedsLogin(true);
          else throw e;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to open invitation.");
      } finally {
        setLoading(false);
      }
    };
    void prepare();
  }, []);
  return (
    <section className="card auth-card">
      <span className="icon-box">
        <Users />
      </span>
      <p className="eyebrow">WORKSPACE INVITATION</p>
      <h1>Good work starts together.</h1>
      <p className="muted">
        Join using the Nillar account and verified email address your workspace
        admin invited.
      </p>
      {loading ? (
        <p role="status">
          <LoaderCircle className="spin" size={16} /> Checking your invitation…
        </p>
      ) : needsLogin ? (
        <>
          <p className="small muted">
            Your invitation is saved securely for this sign-in. You can return
            here after creating an account.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/login?next=/join">
              Sign in
              <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" href="/register?next=/join">
              Create account
            </Link>
          </div>
        </>
      ) : account && !account.emailVerified ? (
        <>
          <p className="small muted">
            Confirm your work email: <strong>{account.email}</strong>. Your
            invitation will be matched to this verified address.
          </p>
          {emailSent ? (
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
                  setAccount({ ...account, emailVerified: true });
                  setNotice(
                    "Work email verified. You can now accept your invitation.",
                  );
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
              <label>
                Email code
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                Verify work email
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <button
              className="button primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await consoleRequest("email/send", { method: "POST" });
                  setEmailSent(true);
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Unable to send email code.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Mail size={16} />
              Send work-email code
            </button>
          )}
        </>
      ) : pending && account ? (
        <>
          <p className="small muted">Signed in as {account.email}.</p>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                const result = await consoleRequest<{ workspaceId: string }>(
                  "invitations/accept",
                  { method: "POST", body: {} },
                );
                router.replace(
                  "/dashboard?" +
                    new URLSearchParams({
                      workspace: result.workspaceId,
                      environment: "SANDBOX",
                    }),
                );
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Unable to accept invitation.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
            Accept workspace invitation
          </button>
        </>
      ) : null}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
