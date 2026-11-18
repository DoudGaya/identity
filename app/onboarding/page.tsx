import { portalMode } from "@/lib/config";
import Onboarding from "@/components/onboarding";
import { headers } from "next/headers";
export default async function OnboardingPage() {
  if (!["live", "staging"].includes(portalMode()))
    return (
      <main id="main" className="prose">
        <h1>Verification is unavailable</h1>
        <p>Please return to your Nillar app or contact support.</p>
      </main>
    );
  return <Onboarding uploadOrigin={process.env.IDENTITY_UPLOAD_ORIGIN || ""} nonce={(await headers()).get('x-nonce') || undefined} fimsNinOnly={process.env.IDENTITY_IDENTIFIER_PROVIDER === 'fims'} selfHostedBiometrics={process.env.IDENTITY_BIOMETRIC_MODE === 'self-hosted'} />;
}
