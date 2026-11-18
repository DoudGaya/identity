"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { accountRequest } from "@/lib/console/account";
export function PasswordRecovery({ enabled }: { enabled: boolean }) {
  const [stage, setStage] = useState(1),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!enabled)
    return (
      <section className="card auth-card">
        <h1>Account recovery is unavailable.</h1>
        <p>Please contact Nillar support.</p>
      </section>
    );
  if (stage === 3)
    return (
      <section className="card auth-card">
        <span className="icon-box">
          <Check />
        </span>
        <h1>You’re ready to sign in.</h1>
        <p className="muted">
          Your password has been updated. Sign in again to continue.
        </p>
        <Link className="button primary" href="/login?next=/dashboard">
          Sign in
          <ArrowRight size={17} />
        </Link>
      </section>
    );
  return (
    <form
      className="card auth-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const values = new FormData(e.currentTarget);
        try {
          if (stage === 1) {
            const address = String(values.get("email"));
            await accountRequest("forgot-password", { email: address });
            setEmail(address);
            setStage(2);
          } else {
            if (values.get("password") !== values.get("confirmPassword"))
              throw new Error("Your passwords don’t match.");
            await accountRequest("reset-password", {
              email,
              otp: values.get("code"),
              newPassword: values.get("password"),
            });
            setStage(3);
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Unable to recover account.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>
        {stage === 1 ? "Let’s get you back in." : "A fresh start, securely."}
      </h1>
      <p className="muted">
        {stage === 1
          ? "Enter your Nillar account email. If the account exists, a reset code will be sent to its registered contact."
          : "Use the six-digit reset code and choose a new password."}
      </p>
      {stage === 1 ? (
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      ) : (
        <>
          <label>
            Reset code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
          </label>
          <label>
            New password
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
          <p className="small muted">
            At least 12 characters, with uppercase and lowercase letters and a
            number.
          </p>
          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>
        </>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        {busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <ArrowRight size={17} />
        )}{" "}
        {stage === 1 ? "Request reset code" : "Save new password"}
      </button>
      <Link
        href="/login?next=/dashboard"
        className="small muted"
        style={{ display: "block", marginTop: 20 }}
      >
        Back to sign in
      </Link>
    </form>
  );
}
