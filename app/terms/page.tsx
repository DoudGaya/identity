import Link from "next/link";
import { Brand } from "@/components/brand";
export const metadata = { title: "Client access terms · Nillar Identity" };
export default function Terms() {
  return (
    <>
      <header className="topbar">
        <Brand />
        <Link href="/docs">Developer documentation</Link>
      </header>
      <main id="main" className="prose">
        <p className="eyebrow">NILLAR IDENTITY</p>
        <h1>Client access and responsible use.</h1>
        <p>
          These portal access terms describe the responsibilities associated
          with a Nillar Identity client workspace. A signed commercial or
          data-processing agreement, where required, governs the services
          supplied to your organisation.
        </p>
        <h2>Your organisation and team</h2>
        <p>
          Create a workspace only if you are authorised to act for the
          organisation. Keep your business details, intended use and customer
          privacy notice accurate. Use individual accounts, assign appropriate
          permissions and remove access when someone leaves your team.
        </p>
        <h2>Credentials and integration</h2>
        <p>
          Keep API keys and webhook signing secrets on your server. Do not
          publish them in browser code, mobile applications, source control or
          support messages. Verify webhook signatures, timestamps and event IDs.
          Validate return state and confirm outcomes through the authenticated
          API or a signed event.
        </p>
        <h2>Sandbox and production</h2>
        <p>
          Sandbox is for clearly marked synthetic tests and does not establish
          anyone’s real identity. Do not enter real identity information into
          sandbox. Live access requires review and activated services; changing
          the environment switch does not enable production. Supported checks,
          charges and service obligations depend on your agreement with Nillar.
        </p>
        <h2>Customer information</h2>
        <p>
          Explain the purpose of verification to your customers, provide the
          applicable notices and obtain the authorisations required for your
          use. Use opaque references in the partner API. Identity numbers,
          documents, selfies and biometric information belong in the secure
          hosted journey, not references, logs or support messages.
        </p>
        <h2>Verification outcomes</h2>
        <p>
          A successful lookup, clean file scan, sandbox result or browser
          redirect is not proof of completed KYC. Wait for the required policy
          outcome and apply your own product’s eligibility and access rules.
          Review or action-required statuses must not be treated as approvals.
        </p>
        <h2>Retention and support</h2>
        <p>
          Retention periods are reviewed under the applicable agreement and
          authorised operations process. The workspace retention setting does
          not automatically destroy evidence or override a legal hold. Contact{" "}
          <a href="mailto:support@nillar.com">support@nillar.com</a> for
          account, commercial or privacy enquiries.
        </p>
        <p>
          Read the <Link href="/privacy">Nillar Identity privacy notice</Link>{" "}
          before providing information or connecting a live integration.
        </p>
      </main>
    </>
  );
}
