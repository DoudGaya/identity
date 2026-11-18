"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FlaskConical, LoaderCircle } from "lucide-react";
import type { Verification } from "@/lib/console/contracts";
type Hosted = {
  verification: Verification;
  sessionId: string;
  workspaceName: string;
  privacyUrl?: string;
  returnUri: string;
  state: string;
  csrf: string;
};
export function ClientHosted() {
  const started = useRef(false),
    [session, setSession] = useState<Hosted | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get(
      "ticket",
    );
    window.history.replaceState(null, "", "/start");
    const start = async () => {
      try {
        if (!ticket)
          throw new Error(
            "Ask the sender for a new verification link. This page must be opened from your secure invitation.",
          );
        const response = await fetch("/api/client-hosted/exchange", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ticket }),
            cache: "no-store",
            credentials: "same-origin",
          }),
          result = await response.json();
        if (!response.ok || !result.success)
          throw new Error(
            result.error?.message || "This verification link is unavailable.",
          );
        const data = result.data as Hosted;
        if (data.verification.environment === "LIVE") {
          sessionStorage.setItem(
            "nillar.identity.handoff",
            JSON.stringify({
              sessionId: data.sessionId,
              verificationId: data.verification.id,
              returnUri: data.returnUri,
              state: data.state,
              workspaceName: data.workspaceName,
              privacyUrl: data.privacyUrl,
            }),
          );
          window.location.replace("/onboarding");
          return;
        }
        setSession(data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Unable to open verification.",
        );
      } finally {
        setLoading(false);
      }
    };
    void start();
  }, []);
  return (
    <section className="card auth-card">
      {loading ? (
        <>
          <LoaderCircle className="spin" size={25} />
          <h1>Opening your secure session.</h1>
          <p className="muted" role="status">
            Just a moment while we check your invitation.
          </p>
        </>
      ) : error && !session ? (
        <>
          <h1>This link needs a fresh start.</h1>
          <p className="notice error" role="alert">
            {error}
          </p>
          <Link className="button secondary" href="/">
            Back to Nillar Identity
          </Link>
        </>
      ) : session ? (
        <>
          <span className="environment">
            <FlaskConical size={13} />
            Sandbox simulation
          </span>
          <h1 style={{ marginTop: 22 }}>A simple test. A clear result.</h1>
          <p className="muted">
            You’re testing a hosted journey for{" "}
            <strong>{session.workspaceName}</strong>. This is not a real
            identity check. Do not enter personal details or upload documents.
          </p>
          <dl className="sandbox-summary">
            <div>
              <dt>Reference</dt>
              <dd>{session.verification.reference}</dd>
            </div>
            <div>
              <dt>Current status</dt>
              <dd>
                {session.verification.status.toLowerCase().replaceAll("_", " ")}
              </dd>
            </div>
          </dl>
          {!["VERIFIED", "REJECTED", "EXPIRED", "CANCELLED"].includes(
            session.verification.status,
          ) ? (
            <>
              <label className="registration-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  I understand this is a synthetic sandbox test and does not
                  verify a real person or business.
                </span>
              </label>
              <div className="sandbox-actions">
                {["VERIFIED", "REVIEW_REQUIRED", "REJECTED"].map((outcome) => (
                  <button
                    key={outcome}
                    className={
                      outcome === "VERIFIED"
                        ? "button primary"
                        : "button secondary"
                    }
                    disabled={busy || !consent}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        const response = await fetch(
                            "/api/client-hosted/simulate",
                            {
                              method: "POST",
                              credentials: "same-origin",
                              cache: "no-store",
                              headers: {
                                "content-type": "application/json",
                                "x-csrf-token": session.csrf,
                              },
                              body: JSON.stringify({ outcome }),
                            },
                          ),
                          result = await response.json();
                        if (!response.ok || !result.success)
                          throw new Error(
                            result.error?.message ||
                              "Unable to simulate outcome.",
                          );
                        setSession({
                          ...session,
                          verification: result.data.verification,
                        });
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Unable to continue.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {outcome === "VERIFIED" ? <Check size={16} /> : null}
                    Simulate {outcome.toLowerCase().replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="notice" role="status">
              The simulated result has been recorded. The client can confirm it
              through its dashboard, API or signed webhook.
            </p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          {session.returnUri && (
            <a
              className="button secondary"
              href={(() => {
                const url = new URL(session.returnUri);
                url.searchParams.set("sessionId", session.verification.id);
                url.searchParams.set("state", session.state);
                return url.toString();
              })()}
            >
              Return to {session.workspaceName}
              <ArrowRight size={16} />
            </a>
          )}
        </>
      ) : null}
    </section>
  );
}
