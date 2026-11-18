"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="console-error" role="alert">
      <h2>We couldn’t open this page.</h2>
      <p>Reload the page to continue.</p>
      <button className="console-button secondary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
