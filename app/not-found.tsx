import Link from 'next/link';
import { Brand } from '@/components/brand';
export default function NotFound() {
  return <><header className="topbar"><Brand /><Link href="/docs">Documentation</Link></header><main id="main" className="prose"><p className="eyebrow">PAGE NOT FOUND</p><h1>This page isn’t here.</h1><p>The address may have changed. Return to your workspace or browse the developer documentation.</p><Link className="button" href="/dashboard">Back to your workspace</Link></main></>;
}
