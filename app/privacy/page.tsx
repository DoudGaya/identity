import Link from "next/link";
import { Brand } from "@/components/brand";
export default function Privacy() {
  return (
    <>
      <header className="topbar">
        <Brand />
        <Link href="/">Back to home</Link>
      </header>
      <main id="main" className="prose">
        <p className="eyebrow">NILLAR IDENTITY</p>
        <h1>Your identity information</h1>
        <p>
          Nillar uses the information you provide to verify your identity or
          business, prevent fraud and assess eligibility for services. Read this
          notice before giving consent. Test environments accept only authorised
          synthetic information.
        </p>
        <h2>What we process</h2>
        <p>
          Personal verification may use your NIN, legal name and contact
          information, identity document images and a live selfie. Biometric
          checks assess liveness and whether your face matches your identity
          record. Business onboarding also uses registration details, business
          activities and information about directors, beneficial owners and
          authorised signatories.
        </p>
        <h2>Verification providers</h2>
        <p>
          Where configured for your verification, Nillar sends required
          information to authorised identity sources and specialist providers,
          including FIMS for NIN lookups and Smile ID for identity, document,
          biometric, screening and business checks. Providers may collect images
          directly through their capture service. Processing may take place
          outside Nigeria.
        </p>
        <h2>Decisions and review</h2>
        <p>
          A successful identity-number lookup is one part of verification.
          Nillar evaluates all checks required for your application. Potential
          screening matches, inconsistent information and business applications
          may need specialist review. Contact support through your Nillar app to
          request review or correct inaccurate information.
        </p>
        <h2>Protection and access</h2>
        <p>
          Identity attributes are encrypted separately from the product
          database. Supporting documents use private encrypted storage and
          remain quarantined until malware checks finish. A clean malware scan
          does not establish authenticity. Access is restricted to authorised
          services and staff for verification and review.
        </p>
        <h2>Retention and requests</h2>
        <p>
          Verification records are retained under the applicable verification,
          fraud prevention and record-keeping requirements. Retention schedules
          and legal holds govern deletion. Contact support through your Nillar
          app about retention, access, correction, deletion or withdrawing
          consent. Withdrawal may prevent verification or access to services
          that require it. Records that must be retained may remain.
        </p>
        <h2>Client workspaces and hosted verification</h2>
        <p>When an organisation invites you to verify through Nillar, the hosted journey identifies that organisation and links to its privacy notice. Read both notices before consenting. The organisation receives verification references, status, reason codes and assurance timestamps through its dashboard and authenticated integration. The client dashboard does not expose your raw identity number, document images or selfie.</p>
        <p>For client operators, Nillar processes account and organisation details, workspace membership, security activity and integration metadata to provide the service. Authorised workspace members can view shared verification outcomes and activity according to their roles. Contact support@nillar.com for account or privacy requests, and contact the inviting organisation about its application and use of your outcome.</p>
        <h2>Business contacts</h2>
        <p>
          Only provide information about another person when authorised. A
          business declaration does not replace individual consent and identity
          verification.
        </p>
        <Link className="button secondary" href="/onboarding">
          Return to verification
        </Link>
      </main>
    </>
  );
}
