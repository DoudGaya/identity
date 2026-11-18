"use client";
import { useState } from "react";
import { identityRequest } from "@/lib/client";
import { uploadAllowed } from "@/lib/policy";

const types = [
  "CAC_CERTIFICATE",
  "MEMORANDUM_ARTICLES",
  "DIRECTOR_REGISTER",
  "OWNERSHIP_REGISTER",
  "REGISTERED_ADDRESS",
  "SCREENING_REPORT",
  "CONTROLLING_PERSON_VERIFICATION",
];
export function BusinessDocuments({
  sessionId,
  uploadOrigin,
}: {
  sessionId: string;
  uploadOrigin: string;
}) {
  const [file, setFile] = useState<File | null>(null),
    [type, setType] = useState(types[0]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [documents, setDocuments] = useState<
    {
      id: string;
      evidenceType: string;
      uploadStatus: string;
      scanStatus: string;
    }[]
  >([]);
  const refresh = async () =>
    setDocuments(
      (await identityRequest(`sessions/${sessionId}/business-documents`))
        .businessDocuments || [],
    );
  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (
        !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
        file.size <= 0 ||
        file.size > 10485760
      )
        throw new Error("Choose a PDF, JPG or PNG up to 10 MB.");
      const bytes = await file.arrayBuffer();
      const checksum = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (value) => value.toString(16).padStart(2, "0"),
      ).join("");
      const result = await identityRequest(
        `sessions/${sessionId}/business-documents`,
        {
          action: "initiate",
          documentType: type,
          mimeType: file.type,
          sizeBytes: file.size,
          sha256: checksum,
        },
        crypto.randomUUID(),
      );
      if (
        !result.upload ||
        !result.businessEvidence ||
        !uploadAllowed(result.upload.uploadUrl, uploadOrigin)
      )
        throw new Error("Secure document storage is not configured.");
      const response = await fetch(result.upload.uploadUrl, {
        method: "PUT",
        headers: result.upload.requiredHeaders,
        body: file,
        credentials: "omit",
        redirect: "error",
      });
      if (!response.ok)
        throw new Error("Document upload failed. Please retry.");
      await identityRequest(`sessions/${sessionId}/business-documents`, {
        action: "complete",
        evidenceId: result.businessEvidence.id,
      });
      setFile(null);
      setMessage(
        "Document received and awaiting malware scanning. Authenticity and business review are separate checks.",
      );
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload this document.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2>Business documents</h2>
      <p>
        Save your company details first. Upload original company records and
        supporting evidence. Each file is checked before a reviewer can access
        it.
      </p>
      <label>
        Document type
        <select
          value={type}
          disabled={busy}
          onChange={(event) => setType(event.target.value)}
        >
          {types.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label>
        Document · PDF, JPG or PNG, up to 10 MB
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={busy}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <button disabled={busy || !file} onClick={upload}>
        {busy ? "Uploading…" : "Upload securely"}
      </button>
      <button
        disabled={busy}
        onClick={() => {
          void refresh().catch((error) => setMessage(error.message));
        }}
      >
        Refresh document status
      </button>
      {message && <p role="status">{message}</p>}
      <ul>
        {documents.map((document) => (
          <li key={document.id}>
            {document.evidenceType.split(":")[1].replaceAll("_", " ")} ·{" "}
            {document.uploadStatus.toLowerCase()} · scan{" "}
            {document.scanStatus.toLowerCase()}
          </li>
        ))}
      </ul>
    </section>
  );
}
