"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, RefreshCw } from "lucide-react";
import { csrf, refresh, ClientError } from "@/lib/client";
import {
  Button,
  date,
  Dialog,
  Empty,
  ErrorState,
  Loading,
  Notice,
  Panel,
  Status,
} from "./ui";
type Session = {
  id: string;
  client: string;
  deviceName: string | null;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
};
async function account<T>(
  action: string,
  body?: unknown,
  signal?: AbortSignal,
  retried = false,
): Promise<T> {
  const response = await fetch(`/api/account/${action}`, {
    method: body === undefined ? "GET" : "POST",
    cache: "no-store",
    credentials: "same-origin",
    signal,
    headers:
      body === undefined
        ? {}
        : { "content-type": "application/json", "x-csrf-token": await csrf() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401 && !retried) {
    await refresh();
    return account(action, body, signal, true);
  }
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new ClientError(
      result.error?.message || "Unable to update account sessions.",
      response.status,
    );
  return result.data as T;
}
export function AccountSessions() {
  const [data, setData] = useState<Session[] | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [selected, setSelected] = useState<Session | "ALL" | null>(null),
    [busy, setBusy] = useState(false),
    router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void account<{ sessions: Session[] }>(
      "sessions",
      undefined,
      controller.signal,
    )
      .then((value) => {
        setData(value.sessions);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Sessions unavailable.");
      });
    return () => controller.abort();
  }, [version]);
  const active = data?.filter(
    (item) => !item.revokedAt && new Date(item.expiresAt) > new Date(),
  );
  return (
    <Panel
      title="Signed-in devices"
      description="Review the devices connected to your Nillar account."
      action={
        <Button variant="secondary" onClick={() => setVersion((v) => v + 1)}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      }
    >
      {error && (
        <ErrorState error={error} retry={() => setVersion((v) => v + 1)} />
      )}
      {!data && !error ? (
        <Loading />
      ) : active?.length ? (
        <>
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Last active</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {active.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Monitor size={15} />{" "}
                      {item.deviceName || item.client || "Nillar session"}
                      <small>Signed in {date(item.createdAt)}</small>
                    </td>
                    <td>{date(item.lastSeenAt, true)}</td>
                    <td>
                      {item.current ? (
                        <Status value="CURRENT" />
                      ) : (
                        <Button
                          variant="secondary"
                          className="compact"
                          onClick={() => {
                            setError("");
                            setSelected(item);
                          }}
                        >
                          Sign out device
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="console-panel-body">
            <Button
              variant="secondary"
              onClick={() => {
                setError("");
                setSelected("ALL");
              }}
            >
              Sign out all devices
            </Button>
          </div>
        </>
      ) : (
        data && (
          <Empty
            title="No active devices reported"
            description="Refresh this list to retrieve current account sessions."
          />
        )
      )}
      {selected && (
        <Dialog
          title={
            selected === "ALL"
              ? "Sign out every device?"
              : "Sign out this device?"
          }
          description={
            selected === "ALL"
              ? "This includes your current session. Sign in again to continue."
              : selected.deviceName || selected.client
          }
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await account(
                  "revoke-session",
                  selected === "ALL"
                    ? { scope: "ALL" }
                    : { scope: "ONE", sessionId: selected.id },
                );
                if (selected === "ALL") {
                  router.replace("/login");
                  router.refresh();
                } else {
                  setSelected(null);
                  setVersion((v) => v + 1);
                }
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Unable to sign out device.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {error && <Notice error>{error}</Notice>}
            <div className="console-form-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Back
              </Button>
              <Button variant="danger" busy={busy}>
                Sign out
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </Panel>
  );
}
