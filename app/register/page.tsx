import Link from "next/link";
import { Brand } from "@/components/brand";
import { Registration } from "@/components/registration";
import { portalMode } from "@/lib/config";
export const metadata = {
  title: "Create your client account · Nillar Identity",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const returnTo =
    (await searchParams).next === "/join" ? "/join" : "/dashboard/setup";
  return (
    <>
      <header className="topbar">
        <Brand />
        <Link href="/docs">Developer documentation</Link>
      </header>
      <main id="main" className="auth-container">
        <Registration
          enabled={["staging", "live"].includes(portalMode())}
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          returnTo={returnTo}
        />
      </main>
    </>
  );
}
