"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { identityRequest } from "@/lib/client";
import type { Session } from "@/lib/contracts";
import { BusinessDocuments } from "@/components/business-documents";
import { SelfieCapture } from "@/components/selfie-capture";

type Handoff = { sessionId: string; returnUri: string; state: string; verificationId?:string;workspaceName?:string;privacyUrl?:string };
type Person = {
  name: string;
  email: string;
  roles: ("DIRECTOR" | "BENEFICIAL_OWNER" | "AUTHORISED_SIGNATORY")[];
  ownershipPercent: number;
  consentToContact: boolean;
};
declare global {
  interface Window {
    SmileIdentity?: (options: Record<string, unknown>) => void;
  }
}

export default function Onboarding({ uploadOrigin, nonce, fimsNinOnly = false, selfHostedBiometrics = false }: { uploadOrigin: string; nonce?: string; fimsNinOnly?: boolean; selfHostedBiometrics?: boolean }) {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading your verification…");
  const [consent, setConsent] = useState(false);
  const [nin, setNin] = useState("");
  const [identitySaved, setIdentitySaved] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationType, setRegistrationType] = useState("LIMITED_COMPANY");
  const [incorporationDate, setIncorporationDate] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [businessActivity, setBusinessActivity] = useState("");
  const [people, setPeople] = useState<Person[]>([
    {
      name: "",
      email: "",
      roles: ["DIRECTOR", "AUTHORISED_SIGNATORY"],
      ownershipPercent: 0,
      consentToContact: false,
    },
  ]);
  const [authority, setAuthority] = useState(false);
  const [completeOwnership, setCompleteOwnership] = useState(false);
  useEffect(() => {
    void Promise.resolve()
      .then(async () => {
        const value = JSON.parse(
          sessionStorage.getItem("nillar.identity.handoff") || "null",
        ) as Handoff | null;
        if (!value) {
          setMessage(
            "Choose the verification you need. Sign in with your Nillar account to continue.",
          );
          return;
        }
        if (!/^[A-Za-z0-9_-]{8,64}$/.test(value.sessionId))
          throw new Error("Return to your Nillar app and start verification.");
        const data = await identityRequest(`sessions/${value.sessionId}`);
        setHandoff({sessionId:value.sessionId,returnUri:value.returnUri,state:value.state,...data.partner||{}});
        if (data.session) {
          setSession(data.session);
          setMessage("");
        }
      })
      .catch((error) =>
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to open this session.",
        ),
      );
  }, []);
  const path = (suffix = "") =>
    `sessions/${handoff?.sessionId}${suffix ? `/${suffix}` : ""}`;
  const begin = (policyCode: "CONSUMER_VA_P0" | "BUSINESS_P0") =>
    act(async () => {
      const data = await identityRequest(
        "sessions",
        { policyCode, channel: "WEB" },
        crypto.randomUUID(),
      );
      if (!data.session)
        throw new Error("Could not create verification session.");
      const value = { sessionId: data.session.id, returnUri: "", state: "" };
      sessionStorage.setItem("nillar.identity.handoff", JSON.stringify(value));
      setHandoff(value);
      setSession(data.session);
    });
  async function act(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not complete this step. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const refresh = async () => {
    const data = await identityRequest(path());
    if (data.session) setSession(data.session);
  };
  const grantConsent = () =>
    act(async () => {
      await identityRequest(
        path("consent"),
        { accepted: true },
        crypto.randomUUID(),
      );
      setConsent(true);
      await refresh();
    });
  const saveNin = () =>
    act(async () => {
      await identityRequest(
        path("attributes"),
        { attributeType: "NIN", value: nin },
        crypto.randomUUID(),
      );
      setNin("");
      setIdentitySaved(true);
      setMessage(
        "Your identity number has been saved securely. Continue with your checks.",
      );
    });
  const verifyNin = () =>
    act(async () => {
      const data = await identityRequest(
        path("submit"),
        { attributeType: "NIN" },
        crypto.randomUUID(),
      );
      if (!data.session) throw new Error("Unable to retrieve verification status. Check status before retrying.");
      setSession(data.session);
      setIdentitySaved(false);
      setMessage(
        data.session.reasonCodes.includes("NIN_RECORD_FOUND")
          ? "Your NIN record was found. Holder verification and the remaining checks are still required before approval."
          : "Your verification status has been updated. A service interruption does not mean your identity was rejected.",
      );
    });
  const capture = (product: "biometric_kyc" | "document_verification") =>
    act(async () => {
      if (!window.SmileIdentity)
        throw new Error(
          "The camera verification service has not loaded. Please retry.",
        );
      const result = await identityRequest(
        path("capture"),
        { action: "start", product },
        crypto.randomUUID(),
      );
      if (!result.capture)
        throw new Error("Unable to start camera verification.");
      const configuration = result.capture;
      await new Promise<void>((resolve, reject) => {
        window.SmileIdentity!({
          ...configuration,
          onResult: (response: {
            status?: string;
            value?: { job_id?: string };
          }) => {
            if (response.status === "success" && response.value?.job_id) {
              // SDK success means submitted. A server API check establishes the result.
              void identityRequest(path("capture"), {
                action: "reconcile",
                jobId: configuration.jobId,
                providerJobId: response.value.job_id,
              })
                .then(async () => {
                  await refresh();
                  setMessage(
                    "Capture received. Your verification result will update after the checks finish.",
                  );
                  resolve();
                })
                .catch(reject);
            } else if (response.status === "cancelled") {
              setMessage("Capture was closed. You can try again.");
              resolve();
            } else
              reject(
                new Error(
                  "Capture could not complete. Check camera access and retry.",
                ),
              );
          },
        });
      });
    });
  function returnToApp() {
    if (!handoff) return;
    const uri = new URL(handoff.returnUri);
    uri.searchParams.set("sessionId", handoff.verificationId||handoff.sessionId);
    uri.searchParams.set("state", handoff.state);
    // This URI came from the server's exact allowlist. No result flag is sent.
    window.location.assign(uri.toString());
  }
  const saveBusiness = () =>
    act(async () => {
      await identityRequest(
        path("business"),
        {
          legalName,
          registrationNumber,
          registrationType,
          country: "NG",
          incorporationDate,
          registeredAddress,
          businessActivity,
          people,
          authorityConfirmed: authority,
          ownershipComplete: completeOwnership,
        },
        crypto.randomUUID(),
      );
      setMessage(
        "Company details saved securely. Business registry, document and controlling-person checks must finish before approval.",
      );
      await refresh();
    });
  const business = session?.policyCode === "BUSINESS_P0" || session?.policyCode === "PARTNER_BUSINESS_P0";
  return (
    <main id="main" className="onboarding">
      {!fimsNinOnly && <Script
        nonce={nonce}
        src="https://cdn.usesmileid.com/inline/v12/js/script.min.js"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onError={() =>
          setMessage(
            "Camera verification could not load. Please check your connection.",
          )
        }
      />}
      <style>{`.onboarding{max-width:720px;margin:50px auto;padding:24px;color:#193b2c}.onboarding h1{font-size:36px}.onboarding section{margin:24px 0;padding:24px;border:1px solid #d5e1d8;border-radius:16px;background:white}.onboarding label{display:block;margin:14px 0}.onboarding input:not([type=checkbox]),.onboarding textarea,.onboarding select{display:block;width:100%;padding:12px;border:1px solid #bccbc1;border-radius:8px;margin-top:6px}.onboarding button{background:#285c45;color:white;padding:12px 18px;border-radius:8px;margin:8px 12px 0 0}.onboarding button:disabled{opacity:.5}.onboarding fieldset{border:1px solid #d5e1d8;padding:16px;margin-top:18px}.onboarding p{line-height:1.6}`}</style>
      <h1>Nillar Identity</h1>
      {handoff?.workspaceName && <p className="partner-verification-notice">You’re verifying for <strong>{handoff.workspaceName}</strong>. Read <a href={handoff.privacyUrl} target="_blank" rel="noopener noreferrer">their privacy notice</a> alongside Nillar’s before giving consent.</p>}
      <p>
        {business
          ? "Verify your business and the people who control it."
          : fimsNinOnly ? "Check your NIN record as the first step of identity verification." : "Secure identity, document and selfie verification."}
      </p>
      {message && <section role="status">{message}</section>}
      {!session && !busy && (
        <section>
          <a href="/login">Sign in to Nillar</a>
          <p>Choose your onboarding type after signing in.</p>
          <button onClick={() => begin("CONSUMER_VA_P0")}>
            Personal verification
          </button>
          {!fimsNinOnly && <button onClick={() => begin("BUSINESS_P0")}>
            Business verification
          </button>}
        </section>
      )}
      {session && (
        <>
          <p>
            Status:{" "}
            <strong>{session.status.replaceAll("_", " ").toLowerCase()}</strong>
          </p>
          {!["VERIFIED", "REJECTED", "REVOKED", "EXPIRED"].includes(
            session.status,
          ) && (
            <>
              <section>
                <h2>Consent and privacy</h2>
                <p>
                  {fimsNinOnly ? "We send your NIN securely to FIMS to check your identity record and prevent fraud. Nillar uses your NIN portrait and camera images for face matching and liveness where enabled. Other checks required for your application may include financial crime screening. A record lookup alone does not complete verification." : <>We use your information to verify identity, prevent fraud and
                  screen for financial crime. Our verification providers may
                  process your identity document and selfie to check
                  authenticity, liveness and whether they match. For business
                  onboarding, we also verify registration and controlling
                  persons.</>}
                </p>
                <p>
                  Read the{" "}
                  <a href="/privacy" target="_blank" rel="noreferrer">
                    privacy notice
                  </a>{" "}
                  before continuing. Only submit information you are authorised
                  to provide.
                </p>
                <label>
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                  />{" "}
                  {fimsNinOnly ? "I consent to NIN verification through FIMS, Nillar's face matching and liveness checks, and the screening required for my application." : "I consent to the required identity, biometric and screening checks."}
                </label>
                <button disabled={busy || !consent} onClick={grantConsent}>
                  Save consent
                </button>
              </section>
              {business && fimsNinOnly ? (
                <section><h2>Business verification pending</h2><p>Business verification is not available in this onboarding flow. Contact support through your Nillar app.</p></section>
              ) : business ? (
                <section>
                  <h2>Company details</h2>
                  <label>
                    Registered legal name
                    <input
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      maxLength={200}
                    />
                  </label>
                  <label>
                    CAC registration number
                    <input
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      maxLength={40}
                    />
                  </label>
                  <label>
                    Registration type
                    <select
                      value={registrationType}
                      onChange={(e) => setRegistrationType(e.target.value)}
                    >
                      {[
                        "LIMITED_COMPANY",
                        "BUSINESS_NAME",
                        "INCORPORATED_TRUSTEES",
                        "PARTNERSHIP",
                        "LLP",
                      ].map((type) => (
                        <option key={type} value={type}>
                          {type.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Incorporation date
                    <input
                      type="date"
                      value={incorporationDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setIncorporationDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Registered address
                    <textarea
                      value={registeredAddress}
                      onChange={(e) => setRegisteredAddress(e.target.value)}
                      maxLength={1000}
                    />
                  </label>
                  <label>
                    Business activity
                    <textarea
                      value={businessActivity}
                      onChange={(e) => setBusinessActivity(e.target.value)}
                      maxLength={1000}
                    />
                  </label>
                  <h3>Directors, beneficial owners and signatories</h3>
                  <p>
                    List all directors and beneficial owners, including the
                    authorised signatory. Each person needs separate identity
                    verification.
                  </p>
                  {people.map((person, index) => (
                    <fieldset key={index}>
                      <legend>Person {index + 1}</legend>
                      <label>
                        Legal name
                        <input
                          value={person.name}
                          onChange={(e) =>
                            setPeople(
                              people.map((item, i) =>
                                i === index
                                  ? { ...item, name: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          maxLength={160}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={person.email}
                          onChange={(e) =>
                            setPeople(
                              people.map((item, i) =>
                                i === index
                                  ? { ...item, email: e.target.value }
                                  : item,
                              ),
                            )
                          }
                          maxLength={254}
                        />
                      </label>
                      {(
                        [
                          "DIRECTOR",
                          "BENEFICIAL_OWNER",
                          "AUTHORISED_SIGNATORY",
                        ] as const
                      ).map((role) => (
                        <label key={role}>
                          <input
                            type="checkbox"
                            checked={person.roles.includes(role)}
                            onChange={(e) =>
                              setPeople(
                                people.map((item, i) =>
                                  i === index
                                    ? {
                                        ...item,
                                        roles: e.target.checked
                                          ? [...item.roles, role]
                                          : item.roles.filter(
                                              (value) => value !== role,
                                            ),
                                      }
                                    : item,
                                ),
                              )
                            }
                          />{" "}
                          {role.replaceAll("_", " ")}
                        </label>
                      ))}
                      <label>
                        Ownership %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={person.ownershipPercent}
                          onChange={(e) =>
                            setPeople(
                              people.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      ownershipPercent: Number(e.target.value),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={person.consentToContact}
                          onChange={(e) =>
                            setPeople(
                              people.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      consentToContact: e.target.checked,
                                    }
                                  : item,
                              ),
                            )
                          }
                        />{" "}
                        I am authorised to provide these details for
                        verification.
                      </label>
                      {people.length > 1 && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            setPeople(people.filter((_, i) => i !== index))
                          }
                        >
                          Remove person
                        </button>
                      )}
                    </fieldset>
                  ))}
                  <button
                    disabled={busy || people.length >= 30}
                    onClick={() =>
                      setPeople([
                        ...people,
                        {
                          name: "",
                          email: "",
                          roles: ["BENEFICIAL_OWNER"],
                          ownershipPercent: 0,
                          consentToContact: false,
                        },
                      ])
                    }
                  >
                    Add person
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={authority}
                      onChange={(e) => setAuthority(e.target.checked)}
                    />{" "}
                    I am authorised to act for this business.
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={completeOwnership}
                      onChange={(e) => setCompleteOwnership(e.target.checked)}
                    />{" "}
                    I have disclosed the complete ownership and control
                    information.
                  </label>
                  <button
                    disabled={
                      busy || !consent || !authority || !completeOwnership
                    }
                    onClick={saveBusiness}
                  >
                    Save company details
                  </button>
                  <button
                    disabled={busy || !consent}
                    onClick={() =>
                      act(async () => {
                        await identityRequest(
                          path("screening"),
                          { operation: "business" },
                          crypto.randomUUID(),
                        );
                        await refresh();
                        setMessage(
                          "Registry check received. Remaining business checks must complete before approval.",
                        );
                      })
                    }
                  >
                    Verify CAC registration
                  </button>
                </section>
              ) : (
                <>
                  <section>
                    <h2>Identity number</h2>
                    <p>
                      Enter your own NIN. Your legal name in your Nillar profile
                      must match your identity record.
                    </p>
                    <label>
                      NIN
                      <input
                        inputMode="numeric"
                        autoComplete="off"
                        value={nin}
                        maxLength={11}
                        onChange={(e) =>
                          setNin(e.target.value.replace(/\D/g, ""))
                        }
                      />
                    </label>
                    <button
                      disabled={busy || !consent || !/^\d{11}$/.test(nin)}
                      onClick={saveNin}
                    >
                      Save securely
                    </button>
                  </section>
                  {fimsNinOnly ? <>
                  <section>
                    <h2>NIN record check</h2>
                    <p>Check your identity record. Selfie matching, liveness and any other required checks must finish before your account can be approved.</p>
                    <button disabled={busy || !consent || !identitySaved || session.status === "REVIEW_REQUIRED"} onClick={verifyNin}>
                      Check NIN record
                    </button>
                  </section>
                  {selfHostedBiometrics && <SelfieCapture sessionId={session.id} disabled={busy || !consent || (!identitySaved && !session.reasonCodes.includes("NIN_RECORD_FOUND"))} onComplete={refresh} />}
                  </> : <>
                  <section>
                    <h2>Identity and selfie</h2>
                    <p>
                      Allow camera access and follow the instructions. We will
                      compare your live selfie with your identity record.
                    </p>
                    <button
                      disabled={busy || !consent || !identitySaved || !sdkReady}
                      onClick={() => capture("biometric_kyc")}
                    >
                      Start identity and selfie check
                    </button>
                  </section>
                  <section>
                    <h2>Document authenticity</h2>
                    <p>
                      Have your original, unexpired identity document ready.
                      Capture it clearly when prompted.
                    </p>
                    <button
                      disabled={busy || !consent || !identitySaved || !sdkReady}
                      onClick={() => capture("document_verification")}
                    >
                      Scan identity document
                    </button>
                  </section>
                  <section>
                    <h2>Financial crime screening</h2>
                    <p>
                      We screen your legal identity for sanctions and other
                      financial crime risks. A possible match may need a
                      specialist review.
                    </p>
                    <button
                      disabled={busy || !consent || !identitySaved}
                      onClick={() =>
                        act(async () => {
                          await identityRequest(
                            path("screening"),
                            { operation: "aml" },
                            crypto.randomUUID(),
                          );
                          await refresh();
                          setMessage(
                            "Screening result received. Check your verification status below.",
                          );
                        })
                      }
                    >
                      Complete screening
                    </button>
                  </section>
                  </>}
                </>
              )}
            </>
          )}
          {business && !fimsNinOnly && (
            <BusinessDocuments
              sessionId={session.id}
              uploadOrigin={uploadOrigin}
            />
          )}
          <button disabled={busy} onClick={() => act(refresh)}>
            Check status
          </button>
          {handoff?.returnUri && (
            <button disabled={busy} onClick={returnToApp}>
              Return to Nillar app
            </button>
          )}
        </>
      )}
    </main>
  );
}
