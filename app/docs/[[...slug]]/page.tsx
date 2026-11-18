import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  BookOpen,
  Code2,
  Webhook,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { CopyButton } from "@/components/console/ui";
import { docs } from "@/lib/console/documentation";
import "./documentation.css";
const links = [
  ["", "Documentation"],
  ["quickstart", "Quickstart"],
  ["api-reference", "API reference"],
  ["webhooks", "Webhooks"],
  ["sandbox", "Sandbox testing"],
  ["sdks", "SDKs & tools"],
  ["errors", "Errors & troubleshooting"],
  ["security", "Security"],
];
type Props = { params: Promise<{ slug?: string[] }> };
export async function generateMetadata({ params }: Props) {
  const doc = docs[((await params).slug || []).join("/")];
  return {
    title: `${doc?.title || "Documentation"} · Nillar Identity`,
    description: doc?.description,
    robots: { index: true, follow: true },
  };
}
export default async function Page({ params }: Props) {
  const slug = ((await params).slug || []).join("/"),
    doc = docs[slug];
  if (!doc) notFound();
  return (
    <div className="identity-docs">
      <header className="topbar">
        <Brand />
        <nav aria-label="Documentation header">
          <Link href="/login?next=/dashboard">Client sign in</Link>
          <Link className="button primary" href="/register">
            Create account
            <ArrowRight size={14} />
          </Link>
        </nav>
      </header>
      <div className="docs-grid">
        <aside className="docs-sidebar">
          <p>DEVELOPER DOCUMENTATION</p>
          <nav aria-label="Documentation sections">
            {links.map(([path, label]) => (
              <Link
                key={path}
                href={`/docs${path ? "/" + path : ""}`}
                aria-current={slug === path ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="docs-downloads">
            <a href="/openapi.json" download>
              <Download size={14} />
              OpenAPI contract
            </a>
            <a href="/nillar-identity.postman_collection.json" download>
              <Download size={14} />
              Postman collection
            </a>
            <a href="/sdk/nillar-identity-node-0.1.0.tgz" download>
              <Download size={14} />
              Node.js SDK
            </a>
          </div>
          <Link className="docs-dashboard-link" href="/dashboard">
            Open your workspace
            <ArrowUpRight size={14} />
          </Link>
        </aside>
        <main id="main" className="docs-article">
          <p className="eyebrow">
            NILLAR IDENTITY /{" "}
            {slug
              ? slug.replaceAll("-", " ").toUpperCase()
              : "DEVELOPER PLATFORM"}
          </p>
          <h1>{doc.title}</h1>
          <p className="docs-lead">{doc.description}</p>
          {!slug && (
            <div className="docs-feature-grid">
              {[
                ["quickstart", "Make your first request", Code2],
                ["webhooks", "Connect your events", Webhook],
                ["security", "Build with confidence", ShieldCheck],
                ["sdks", "Choose your tools", BookOpen],
              ].map(([path, title, Icon]) => {
                const ItemIcon = Icon as typeof Code2;
                return (
                  <Link key={String(path)} href={`/docs/${path}`}>
                    <ItemIcon size={21} />
                    <strong>{String(title)}</strong>
                    <ArrowUpRight size={15} />
                  </Link>
                );
              })}
            </div>
          )}
          {doc.sections.map((section, i) => (
            <section key={section.title} id={`section-${i + 1}`}>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.code && (
                <div className="docs-code">
                  <div>
                    <span>Example</span>
                    <CopyButton value={section.code} label="Copy example" />
                  </div>
                  <pre>
                    <code>{section.code}</code>
                  </pre>
                </div>
              )}
            </section>
          ))}
          <footer>
            <span>Built for clarity. Designed for trust.</span>
            <Link href="/dashboard/support">
              Need a hand?
              <ArrowRight size={14} />
            </Link>
          </footer>
        </main>
        <aside className="docs-on-this-page">
          <p>ON THIS PAGE</p>
          {doc.sections.map((section, i) => (
            <a key={section.title} href={`#section-${i + 1}`}>
              {section.title}
            </a>
          ))}
        </aside>
      </div>
    </div>
  );
}
