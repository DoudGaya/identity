import { Brand } from "@/components/brand";
import { AcceptInvitation } from "@/components/accept-invitation";
export const metadata = {
  title: "Join your team · Nillar Identity",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <>
      <header className="topbar">
        <Brand />
      </header>
      <main id="main" className="auth-container">
        <AcceptInvitation />
      </main>
    </>
  );
}
