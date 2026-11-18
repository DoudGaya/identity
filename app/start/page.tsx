import { Brand } from "@/components/brand";
import { ClientHosted } from "@/components/client-hosted";
export const metadata = {
  title: "Secure verification · Nillar Identity",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <header className="topbar">
        <Brand />
      </header>
      <main id="main" className="auth-container">
        <ClientHosted />
      </main>
    </>
  );
}
