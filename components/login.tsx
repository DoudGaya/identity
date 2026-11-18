'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { ArrowRight, LoaderCircle, LockKeyhole } from 'lucide-react';
import { authRequest } from '@/lib/client';
import type { Mode } from '@/lib/contracts';

export function Login({ mode, siteKey,returnTo='/dashboard' }: { mode: Mode; siteKey?: string;returnTo?:string }) {
  const router = useRouter(); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [mfa, setMfa] = useState(false); const [recovery, setRecovery] = useState(false); const [turnstileToken, setTurnstileToken] = useState('');
  if (!['staging', 'live'].includes(mode)) return <section className="card auth-card"><span className="icon-box"><LockKeyhole /></span><h1>{mode === 'preview' ? 'Explore without signing in' : 'Verification is unavailable'}</h1><p className="muted">{mode === 'preview' ? 'The demo uses sample details, so you won’t need a password or real documents.' : 'Please return to your Nillar app for support.'}</p>{mode === 'preview' && <Link className="button primary" href="/verify">Open the demo<ArrowRight size={18} /></Link>}</section>;
  return <form className="card auth-card" onSubmit={async e => {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    const form = e.currentTarget; const values = new FormData(form);
    try {
      const result = await authRequest('login', { identifier: values.get('identifier'), password: values.get('password'), ...(mfa ? recovery ? { recoveryCode: values.get('code') } : { totpCode: values.get('code') } : {}), ...(siteKey ? { turnstileToken } : {}) });
      if (result.requiresTwoFactor) { setMfa(true); return; }
      if (result.success) { form.reset(); router.replace(returnTo); router.refresh(); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed.'); } finally { setBusy(false); }
  }}><span className="icon-box"><LockKeyhole /></span><p className="eyebrow">NILLAR IDENTITY</p><h1>Welcome back.</h1><p className="muted">Sign in with your Nillar account to continue verification.</p><label>Email or phone number<input name="identifier" autoComplete="username" required maxLength={254} /></label><label>Password<input name="password" type="password" autoComplete="current-password" required minLength={6} maxLength={256} /></label>{mfa && <><label>{recovery ? 'Recovery code' : 'Authenticator code'}<input key={String(recovery)} name="code" autoComplete="one-time-code" inputMode={recovery ? 'text' : 'numeric'} pattern={recovery ? undefined : '[0-9]{6}'} required /></label><button className="text-button" type="button" onClick={() => setRecovery(!recovery)}>{recovery ? 'Use authenticator instead' : 'Use a recovery code'}</button></>}{siteKey && <Turnstile siteKey={siteKey} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken('')} onError={() => setTurnstileToken('')} />}{error && <p className="notice error" role="alert">{error}</p>}<button className="button primary" disabled={busy || Boolean(siteKey && !turnstileToken)}>{busy ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />} {mfa ? 'Verify and continue' : 'Sign in'}</button><p className="small muted">Account recovery is available through your Nillar app.</p></form>;
}

