"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  bootstrapSchema,
  type Bootstrap,
  type Workspace,
  type Environment,
} from "@/lib/console/contracts";
import { consoleRequest } from "@/lib/console/client";
import { authRequest } from "@/lib/client";
import { ErrorState, Loading } from "./ui";
type Context = {
  bootstrap: Bootstrap;
  workspace: Workspace | null;
  environment: Environment;
  version: number;
  reload: () => Promise<void>;
  invalidate: () => void;
  link: (path: string) => string;
  api: <T>(
    path: string,
    options?: {
      method?: "GET" | "POST" | "PATCH";
      body?: unknown;
      key?: string;
      signal?: AbortSignal;
    },
  ) => Promise<T>;
  selectWorkspace: (id: string) => void;
  selectEnvironment: (value: Environment) => void;
  logout: () => Promise<void>;
};
const ConsoleContext = createContext<Context | null>(null);
export function useConsole() {
  const value = useContext(ConsoleContext);
  if (!value) throw new Error("Client workspace context is missing");
  return value;
}
export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    router = useRouter(),
    query = useSearchParams(),
    pathname = usePathname();
  const reload = useCallback(async () => {
    try {
      const raw = await consoleRequest<unknown>("me");
      setBootstrap(bootstrapSchema.parse(raw));
      setError("");
      setVersion((v) => v + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your workspace is unavailable.",
      );
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void consoleRequest<unknown>("me", { signal: controller.signal })
      .then((raw) => {
        if (!controller.signal.aborted)
          setBootstrap(bootstrapSchema.parse(raw));
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Your workspace is unavailable.",
          );
      });
    return () => controller.abort();
  }, []);
  const workspace =
      bootstrap?.workspaces.find((w) => w.id === query.get("workspace")) ||
      bootstrap?.workspaces[0] ||
      null,
    environment: Environment =
      query.get("environment") === "LIVE" ? "LIVE" : "SANDBOX";
  const link = useCallback(
    (path: string) =>
      `${path}?${new URLSearchParams({ ...(workspace ? { workspace: workspace.id } : {}), environment })}`,
    [workspace, environment],
  );
  const api = useCallback(
    <T,>(
      path: string,
      options: {
        method?: "GET" | "POST" | "PATCH";
        body?: unknown;
        key?: string;
        signal?: AbortSignal;
      } = {},
    ) => {
      if (!workspace) throw new Error("Create a workspace to continue.");
      return consoleRequest<T>(
        `workspaces/${workspace.id}/${path}${path.includes("?") ? "&" : "?"}environment=${environment}`,
        options,
      );
    },
    [workspace, environment],
  );
  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  if (!bootstrap)
    return (
      <main id="main" className="console-bootstrap">
        {error ? (
          <ErrorState error={error} retry={() => void reload()} />
        ) : (
          <Loading />
        )}
      </main>
    );
  return (
    <ConsoleContext.Provider
      value={{
        bootstrap,
        workspace,
        environment,
        version,
        reload,
        invalidate,
        link,
        api,
        selectWorkspace: (id) =>
          router.push(
            `/dashboard?${new URLSearchParams({ workspace: id, environment })}`,
          ),
        selectEnvironment: (value) => {
          const base = /\/(verifications|customers|webhooks)\/[^/]+$/.test(
            pathname,
          )
            ? pathname.slice(0, pathname.lastIndexOf("/"))
            : pathname;
          router.push(
            `${base}?${new URLSearchParams({ ...(workspace ? { workspace: workspace.id } : {}), environment: value })}`,
          );
        },
        logout: async () => {
          await authRequest("logout");
          router.replace("/login");
          router.refresh();
        },
      }}
    >
      {children}
    </ConsoleContext.Provider>
  );
}
export function useResource<T>(path: string | null) {
  const { api, workspace, environment, version, invalidate } = useConsole(),
    key = `${workspace?.id}:${environment}:${path}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
  }>({ key: "", data: null, error: "" });
  useEffect(() => {
    if (!path || !workspace) return;
    const controller = new AbortController();
    void api<T>(path, { signal: controller.signal })
      .then((data) => setState({ key, data, error: "" }))
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({
            key,
            data: null,
            error:
              e instanceof Error
                ? e.message
                : "This information is unavailable.",
          });
      });
    return () => controller.abort();
  }, [api, path, workspace, key, version]);
  return {
    data: state.key === key ? state.data : null,
    error: state.key === key ? state.error : "",
    loading: Boolean(
      path && workspace && (state.key !== key || (!state.data && !state.error)),
    ),
    retry: invalidate,
  };
}
