"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Activity,
  ChartNoAxesCombined,
  KeyRound,
  Webhook,
  ScrollText,
  FlaskConical,
  BookOpen,
  Settings,
  ShieldCheck,
  LifeBuoy,
  ArrowUpRight,
  ChevronDown,
  Menu,
  LogOut,
  Plus,
  ArrowRight,
  Radio,
  Send,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ConsoleProvider, useConsole } from "./context";
import { Dialog } from "./ui";
const groups = [
  {
    label: "WORKSPACE",
    items: [
      ["Overview", "/dashboard", LayoutDashboard],
      ["Verifications", "/dashboard/verifications", ListChecks],
      ["Customers", "/dashboard/customers", Users],
      ["Activity", "/dashboard/activity", Activity],
      ["Usage & billing", "/dashboard/usage", ChartNoAxesCombined],
    ],
  },
  {
    label: "BUILD WITH NILLAR",
    items: [
      ["API keys", "/dashboard/developers/keys", KeyRound],
      ["Webhooks", "/dashboard/developers/webhooks", Webhook],
      ["Deliveries", "/dashboard/developers/deliveries", Send],
      ["API requests", "/dashboard/developers/requests", ScrollText],
      ["Sandbox playground", "/dashboard/developers/playground", FlaskConical],
    ],
  },
  {
    label: "ORGANISATION",
    items: [
      ["Workspace settings", "/dashboard/settings", Settings],
      ["Team", "/dashboard/settings/team", Users],
      ["Security", "/dashboard/settings/security", ShieldCheck],
      ["Go live", "/dashboard/compliance", Radio],
    ],
  },
] as const;
function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { link, workspace, bootstrap, logout } = useConsole(),
    pathname = usePathname();
  return (
    <>
      <div className="console-sidebar-brand">
        <Brand />
      </div>
      <div className="console-workspace-label">
        <span className="console-workspace-monogram">
          {(workspace?.name || "N").slice(0, 1)}
        </span>
        <div>
          <strong>{workspace?.name || "Your workspace"}</strong>
          <span>
            {workspace
              ? `${workspace.role.toLowerCase()} access`
              : "Let’s get you set up"}
          </span>
        </div>
      </div>
      <nav
        aria-label="Client workspace navigation"
        className="console-navigation"
      >
        {groups.map((group) => (
          <div className="console-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map(([label, path, Icon]) => {
              const active =
                path === "/dashboard"
                  ? pathname === path
                  : path === "/dashboard/settings"
                    ? pathname === path
                    : pathname === path || pathname.startsWith(path + "/");
              return (
                <Link
                  key={path}
                  href={link(path)}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
        <div className="console-nav-group">
          <p>RESOURCES</p>
          <Link href="/docs">
            <BookOpen size={17} />
            <span>Documentation</span>
            <ArrowUpRight size={14} />
          </Link>
          <Link href={link("/dashboard/support")} onClick={onNavigate}>
            <LifeBuoy size={17} />
            <span>Help & support</span>
          </Link>
        </div>
      </nav>
      <div className="console-sidebar-account">
        <span className="console-avatar">
          {(bootstrap.user.name || bootstrap.user.email)
            .slice(0, 1)
            .toUpperCase()}
        </span>
        <div>
          <strong>{bootstrap.user.name || "Your account"}</strong>
          <span>{bootstrap.user.email}</span>
        </div>
        <button
          className="console-icon-button"
          title="Sign out"
          aria-label="Sign out"
          onClick={() => void logout()}
        >
          <LogOut size={17} />
        </button>
      </div>
    </>
  );
}
function Frame({ children }: { children: ReactNode }) {
  const {
      bootstrap,
      workspace,
      environment,
      selectWorkspace,
      selectEnvironment,
      link,
    } = useConsole(),
    [menu, setMenu] = useState(false);
  return (
    <div className="console">
      <aside className="console-sidebar">
        <Sidebar />
      </aside>
      <div className="console-main">
        <header className="console-topbar">
          <div className="console-topbar-left">
            <button
              className="console-icon-button console-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <div className="console-workspace-select">
              <label className="sr-only" htmlFor="workspace-select">
                Current workspace
              </label>
              <select
                id="workspace-select"
                value={workspace?.id || ""}
                onChange={(e) => selectWorkspace(e.target.value)}
              >
                {!workspace && <option value="">Create a workspace</option>}
                {bootstrap.workspaces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <Link
              className="console-icon-button console-new-workspace"
              href={link("/dashboard/setup") + "&new=1"}
              aria-label="Create another workspace"
            >
              <Plus size={17} />
            </Link>
          </div>
          <div className="console-topbar-right">
            <div
              className="console-environments"
              role="group"
              aria-label="Verification environment"
            >
              <button
                aria-pressed={environment === "SANDBOX"}
                onClick={() => selectEnvironment("SANDBOX")}
              >
                Sandbox
              </button>
              <button
                aria-pressed={environment === "LIVE"}
                onClick={() => selectEnvironment("LIVE")}
              >
                Live
              </button>
            </div>
            <Link className="console-doc-link" href="/docs">
              Developer docs
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </header>
        {environment === "SANDBOX" ? (
          <div className="console-environment-banner">
            <FlaskConical size={14} />
            <span>
              Sandbox environment. Test your integration with synthetic data.
            </span>
          </div>
        ) : workspace?.productionStatus !== "APPROVED" ? (
          <div className="console-environment-banner attention">
            <ShieldCheck size={14} />
            <span>Live verification is not active for this workspace.</span>
            <Link href={link("/dashboard/compliance")}>
              View requirements
              <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <div className="console-environment-banner live">
            <span className="console-live-dot" />
            Live environment. Real verification requests use your production
            service.
          </div>
        )}
        <main id="main" className="console-content">
          {workspace?.suspendedAt ? (
            <section className="console-note-card" role="status">
              <ShieldCheck size={24} />
              <h1>This workspace is paused.</h1>
              <p>
                Contact Nillar support to review access. You can switch to
                another workspace using the selector above.
              </p>
              <a
                className="console-button secondary"
                href="mailto:support@nillar.com"
              >
                Contact support <ArrowUpRight size={14} />
              </a>
            </section>
          ) : (
            children
          )}
        </main>
        <footer className="console-footer">
          <span>Nillar Identity</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href={link("/dashboard/support")}>Support</Link>
          </div>
        </footer>
      </div>
      {menu && (
        <Dialog title="Your workspace" onClose={() => setMenu(false)}>
          <div className="console-mobile-navigation">
            <Sidebar onNavigate={() => setMenu(false)} />
          </div>
        </Dialog>
      )}
    </div>
  );
}
export function ConsoleShell({ children }: { children: ReactNode }) {
  return (
    <ConsoleProvider>
      <Frame>{children}</Frame>
    </ConsoleProvider>
  );
}
