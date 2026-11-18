"use client";
import { useEffect, useRef, useState } from "react";
import { identityRequest } from "@/lib/client";

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Error("Capture cancelled."));
    const cancel = () => { clearTimeout(timer); reject(new Error("Capture cancelled.")); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, ms);
    signal.addEventListener("abort", cancel, { once: true });
  });
}

export function SelfieCapture({ sessionId, disabled, onComplete }: {
  sessionId: string; disabled: boolean; onComplete: () => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [phase, setPhase] = useState("");
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const stop = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; };
  useEffect(() => () => { controller.current?.abort(); stream.current?.getTracks().forEach(track => track.stop()); }, []);
  // Consent withdrawal or session replacement immediately releases the camera.
  useEffect(() => {
    if (disabled) { controller.current?.abort(); stop(); }
    return () => { controller.current?.abort(); stream.current?.getTracks().forEach(track => track.stop()); };
  }, [disabled, sessionId]);

  async function capture() {
    if (busy || disabled) return;
    const run = new AbortController();
    controller.current = run;
    const frames: string[] = [];
    setBusy(true); setProcessing(false); setMessage(""); setPhase("Preparing your camera…");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Use a supported browser over HTTPS to access your camera.");
      const started = await identityRequest(`sessions/${sessionId}/biometrics`, { action: "start" }, crypto.randomUUID());
      const job = started.biometricCapture;
      if (!job) throw new Error("Unable to start selfie verification.");
      if (run.signal.aborted) throw new Error("Capture cancelled.");
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (run.signal.aborted) { media.getTracks().forEach(track => track.stop()); throw new Error("Capture cancelled."); }
      stream.current = media;
      if (!video.current) throw new Error("Camera preview is unavailable.");
      video.current.srcObject = media;
      await video.current.play();
      setReady(true);
      const canvas = document.createElement("canvas");
      for (const instruction of ["Look straight at the camera.", `Slowly turn your head to your ${job.direction.toLowerCase()}.`, "Look straight at the camera again."]) {
        setPhase(instruction);
        await pause(2000, run.signal);
        for (let index = 0; index < 2; index++) {
          if (Date.now() >= Date.parse(job.expiresAt)) throw new Error("Capture expired. Start a new capture.");
          const current = video.current;
          if (!current || current.readyState < 2 || !current.videoWidth) throw new Error("Camera stopped. Please retry.");
          const ratio = Math.min(640 / current.videoWidth, 640 / current.videoHeight, 1);
          canvas.width = Math.round(current.videoWidth * ratio);
          canvas.height = Math.round(current.videoHeight * ratio);
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Camera capture is unavailable.");
          // The preview is mirrored; evidence is kept in the sensor orientation.
          context.drawImage(current, 0, 0, canvas.width, canvas.height);
          const encoded = canvas.toDataURL("image/jpeg", .65).split(",")[1];
          if (!encoded || encoded.length > 240000) throw new Error("Capture is too large. Please retry.");
          frames.push(encoded);
          await pause(650, run.signal);
        }
      }
      stop(); setReady(false); setPhase("Checking your selfie securely…");
      if (run.signal.aborted) throw new Error("Capture cancelled.");
      setProcessing(true);
      await identityRequest(`sessions/${sessionId}/biometrics`, { action: "complete", jobId: job.jobId, token: job.token, frames }, crypto.randomUUID());
      await onComplete();
      setMessage("Selfie checks processed. Your verification status reflects any checks or review still required.");
    } catch (error) {
      setMessage(run.signal.aborted ? "Capture cancelled. Start again when you are ready." : error instanceof Error ? error.message : "Capture could not finish. Please retry.");
    } finally {
      frames.length = 0;
      stop(); setBusy(false); setProcessing(false); setReady(false); setPhase("");
    }
  }

  return <section>
    <h2>Selfie and liveness</h2>
    <p>Use good lighting and keep only your face in view. We compare a short camera sequence with your NIN portrait and check for spoofing. Nillar processes these images on its own verification service.</p>
    <video ref={video} autoPlay playsInline muted aria-label="Selfie camera preview" style={{ display: busy ? "block" : "none", width: "100%", maxHeight: 420, borderRadius: 12, transform: "scaleX(-1)" }} />
    {busy && <p role="status" aria-live="assertive">{phase}{ready ? " Keep your face inside the preview." : ""}</p>}
    {message && <p role="status">{message}</p>}
    <button disabled={disabled || busy} onClick={() => void capture()}>Start selfie check</button>
    {busy && !processing && <button onClick={() => { controller.current?.abort(); stop(); }}>Cancel capture</button>}
  </section>;
}
