"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  ArrowRight,
  Copy,
  Check,
  LoaderCircle,
  RefreshCw,
  X,
  Inbox,
} from "lucide-react";
import { useState } from "react";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="console-page-heading">
      <div>
        {eyebrow && <p className="console-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="console-heading-action">{action}</div>}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`console-panel ${className}`}>
      {(title || action) && (
        <header className="console-panel-heading">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
export function Status({ value }: { value: string }) {
  const tone = [
    "VERIFIED",
    "DELIVERED",
    "ACTIVE",
    "APPROVED",
    "200",
    "201",
  ].includes(value)
    ? "positive"
    : ["REJECTED", "FAILED", "REVOKED", "CANCELLED"].includes(value)
      ? "negative"
      : ["REVIEW_REQUIRED", "IN_REVIEW", "ACTION_REQUIRED", "EXPIRED"].includes(
            value,
          )
        ? "attention"
        : "neutral";
  return (
    <span className={`console-status ${tone}`}>
      <span />
      {value.toLowerCase().replaceAll("_", " ")}
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="console-empty">
      <span className="console-empty-icon">
        <Inbox size={22} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="console-loading" role="status">
      <LoaderCircle size={20} className="spin" />
      <span>Loading your workspace…</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="console-error" role="alert">
      <strong>We couldn’t load this information.</strong>
      <p>{error}</p>
      {retry && (
        <button className="console-button secondary" onClick={retry}>
          <RefreshCw size={15} />
          Try again
        </button>
      )}
    </div>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`console-notice ${error ? "negative" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Button({
  children,
  busy = false,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  variant?: "primary" | "secondary" | "danger" | "quiet";
}) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`console-button ${variant} ${props.className || ""}`}
    >
      {busy ? <LoaderCircle className="spin" size={16} /> : null}
      {children}
    </button>
  );
}
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState(false);
  return (
    <>
      <button
        type="button"
        className="console-button secondary compact"
        aria-label={copied ? "Copied" : label}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setError(false);
          } catch {
            setError(true);
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        <span>{copied ? "Copied" : label}</span>
      </button>
      {error && (
        <span className="console-help" role="status">
          Select the text and copy it manually.
        </span>
      )}
    </>
  );
}
export function Dialog({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`console-dialog ${wide ? "wide" : ""}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="console-dialog-title">
        <div>
          <h2 id={id}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button
          type="button"
          className="console-icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SecretDialog({
  title,
  value,
  onClose,
}: {
  title: string;
  value: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={title}
      description="This secret is shown once. Save it in your server’s secret manager before closing."
      onClose={onClose}
    >
      <div className="console-secret">
        <code>{value}</code>
        <CopyButton value={value} label="Copy secret" />
      </div>
      <Notice>
        Keep this value on your server. Never include it in a website, mobile
        app, source control or support message.
      </Notice>
      <div className="console-form-actions">
        <Button onClick={onClose}>
          I’ve saved it
          <Check size={16} />
        </Button>
      </div>
    </Dialog>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="console-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function StepUpField() {
  return (
    <Field
      label="Authenticator code"
      hint="Confirm this change with your current six-digit authenticator code."
    >
      <input
        name="securityCode"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={6}
        required
        placeholder="000000"
      />
    </Field>
  );
}
export function Pagination({
  nextCursor,
  onNext,
  onPrevious,
  hasPrevious,
}: {
  nextCursor: string | null;
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
}) {
  return (
    <div className="console-pagination">
      <span>Up to 25 records per page</span>
      <div>
        <Button
          variant="secondary"
          disabled={!hasPrevious}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button variant="secondary" disabled={!nextCursor} onClick={onNext}>
          Next
          <ArrowRight size={15} />
        </Button>
      </div>
    </div>
  );
}
export const date = (value: string | null | undefined, withTime = false) =>
  value
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      }).format(new Date(value))
    : "—";
export const count = (value: number) =>
  new Intl.NumberFormat("en-NG").format(value);
