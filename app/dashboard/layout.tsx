import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { names } from "@/lib/server";
import { ConsoleShell } from "@/components/console/shell";
import "./workspace.css";
export const metadata: Metadata = {
  title: {
    default: "Workspace · Nillar Identity",
    template: "%s · Nillar Identity",
  },
  robots: { index: false, follow: false },
};
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const access = jar.get(names.access)?.value;
  if (
    (!access || access.startsWith("nihs.") || access.startsWith("niphs.")) &&
    !jar.get(names.refresh)?.value
  )
    redirect("/login?next=/dashboard");
  return (
    <Suspense
      fallback={
        <main id="main" className="console-bootstrap">
          Opening your workspace…
        </main>
      }
    >
      <ConsoleShell>{children}</ConsoleShell>
    </Suspense>
  );
}
