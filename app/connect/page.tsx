"use client";
import { useEffect, useRef, useState } from "react";

export default function ConnectPage() {
  const started = useRef(false);
  const [message, setMessage] = useState(
    "Opening your secure verification session…",
  );
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ticket = new URLSearchParams(window.location.hash.slice(1)).get(
      "ticket",
    );
    window.history.replaceState(null, "", "/connect");
    if (!ticket) {
      void Promise.resolve().then(() =>
        setMessage(
          "Return to your Nillar app and start a new verification session.",
        ),
      );
      return;
    }
    void fetch("/api/hosted/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticket }),
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error?.message || "Unable to open verification.",
          );
        sessionStorage.setItem(
          "nillar.identity.handoff",
          JSON.stringify(result),
        );
        window.location.replace("/onboarding");
      })
      .catch((error) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to open verification.",
        ),
      );
  }, []);
  return (
    <main style={{ maxWidth: 560, margin: "15vh auto", padding: 24 }}>
      <h1>Nillar Identity</h1>
      <p role="status">{message}</p>
    </main>
  );
}
