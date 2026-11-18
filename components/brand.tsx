import Image from 'next/image';
import Link from 'next/link';
export function Brand() {
  return <Link href="/" className="brand" aria-label="Nillar Identity home"><Image src="/nillar-icon.png" width={36} height={36} alt="" priority /><span>Nillar <span className="brand-product">Identity</span></span></Link>;
}
