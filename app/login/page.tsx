import { Brand } from '@/components/brand';
import { Login } from '@/components/login';
import { portalMode } from '@/lib/config';
import Link from 'next/link';
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}){const query=await searchParams,returnTo=query.next==='/onboarding'||query.next==='/verify'||query.next==='/join'?query.next:'/dashboard';return <><header className="topbar"><Brand/><Link href="/">Back to home</Link></header><main id="main" className="auth-container"><div><Login mode={portalMode()} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} returnTo={returnTo}/><div className="auth-extra-links"><Link href={returnTo==='/join'?'/register?next=/join':'/register'}>Create a client account</Link><Link href="/forgot-password">Forgot password?</Link></div></div></main></>;}
