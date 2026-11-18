"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { accountRequest } from "@/lib/console/account";
export function Registration({
  enabled,
  siteKey,
  returnTo = "/dashboard/setup",
}: {
  enabled: boolean;
  siteKey?: string;
  returnTo?: "/dashboard/setup" | "/join";
}) {
  const router = useRouter(),
    [step, setStep] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [token, setToken] = useState(""),
    [details, setDetails] = useState({
      email: "",
      phone: "",
      firstName: "",
      lastName: "",
    });
  if (!enabled)
    return (
      <section className="card auth-card">
        <h1>Client registration is unavailable.</h1>
        <p className="muted">
          Please contact support@nillar.com to arrange access.
        </p>
        <Link className="button primary" href="/">
          Back to Nillar Identity
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
        setNotice("");
        const values = new FormData(e.currentTarget);
        try {
          if (step === 1) {
            const next = {
              email: String(values.get("email")),
              phone: String(values.get("phone")),
              firstName: String(values.get("firstName")),
              lastName: String(values.get("lastName")),
            };
            const result = await accountRequest<{ phone: string }>("register", {
              ...next,
              acceptTerms: values.get("terms") === "on",
              ...(siteKey ? { turnstileToken: token } : {}),
            });
            setDetails({ ...next, phone: result.phone });
            setStep(2);
          } else if (step === 2) {
            const result = await accountRequest<{
              requiresPasswordSetup: boolean;
            }>("verify-registration", { ...details, code: values.get("code") });
            if (result.requiresPasswordSetup) setStep(3);
            else {
              router.replace(returnTo);
              router.refresh();
            }
          } else {
            if (values.get("password") !== values.get("confirmPassword"))
              throw new Error("Your passwords don’t match.");
            await accountRequest("set-password", {
              password: values.get("password"),
            });
            router.replace(returnTo);
            router.refresh();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Unable to continue.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="eyebrow">NILLAR IDENTITY · CLIENT ACCESS</p>
      <h1>
        {step === 1
          ? "Built for your next chapter."
          : step === 2
            ? "Check your messages."
            : "Make your account yours."}
      </h1>
      <p className="muted">
        {step === 1
          ? "Create your Nillar account, then set up a workspace for your organisation."
          : step === 2
            ? "Enter the six-digit registration code sent to your registered contact."
            : "Choose a strong password. Your workspace is next."}
      </p>
      <ol className="registration-progress" aria-label="Registration progress">
        {["Your details", "Verification", "Password"].map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <span>{step > index + 1 ? <Check size={12} /> : index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {step === 1 && (
        <>
          <div className="registration-name-row">
            <label>
              First name
              <input
                name="firstName"
                required
                minLength={2}
                maxLength={80}
                autoComplete="given-name"
              />
            </label>
            <label>
              Last name
              <input
                name="lastName"
                required
                minLength={2}
                maxLength={80}
                autoComplete="family-name"
              />
            </label>
          </div>
          <label>
            Work email
            <input
              type="email"
              name="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
          <label>
            Mobile number
            <input
              type="tel"
              name="phone"
              required
              minLength={10}
              maxLength={25}
              pattern="[+]?[0-9 -]+"
              autoComplete="tel"
              placeholder="08012345678"
            />
          </label>
          <label className="registration-consent">
            <input type="checkbox" name="terms" required />
            <span>
              I accept the{" "}
              <Link href="/terms" target="_blank" rel="noopener noreferrer">
                terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                privacy notice
              </Link>{" "}
              for my Nillar account and client access.
            </span>
          </label>
          {siteKey && (
            <Turnstile
              siteKey={siteKey}
              onSuccess={setToken}
              onExpire={() => setToken("")}
              onError={() => setToken("")}
            />
          )}
        </>
      )}
      {step === 2 && (
        <>
          <label>
            Registration code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await accountRequest("resend-registration", {
                  email: details.email,
                  phone: details.phone,
                });
                setNotice("If eligible, a new registration code will be sent.");
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Unable to resend code.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Request another code
          </button>
        </>
      )}
      {step === 3 && (
        <>
          <label>
            Password
            <input
              type="password"
              name="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
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
              type="password"
              name="confirmPassword"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
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
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <button
        className="button primary"
        disabled={busy || (step === 1 && Boolean(siteKey && !token))}
      >
        {busy ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <ArrowRight size={17} />
        )}{" "}
        {step === 3
          ? "Open your workspace"
          : step === 2
            ? "Verify and continue"
            : "Create account"}
      </button>
      <p className="small muted" style={{ marginTop: 22, marginBottom: 0 }}>
        Already have a Nillar account?{" "}
        <Link href="/login?next=/dashboard">
          Sign in
          <ArrowRight size={12} />
        </Link>
      </p>
      {step === 2 && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setStep(1);
            setError("");
          }}
        >
          <ArrowLeft size={12} />
          Change details
        </button>
      )}
    </form>
  );
}
