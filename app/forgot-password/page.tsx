import { Brand } from "@/components/brand";
import { PasswordRecovery } from "@/components/password-recovery";
import { portalMode } from "@/lib/config";
export const metadata = { title: "Account recovery · Nillar Identity" };
export default function Page() {
  return (
    <>
      <header className="topbar">
        <Brand />
      </header>
      <main id="main" className="auth-container">
        <PasswordRecovery
          enabled={["staging", "live"].includes(portalMode())}
        />
      </main>
    </>
  );
}
