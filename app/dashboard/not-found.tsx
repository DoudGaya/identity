import Link from "next/link";
export default function NotFound() {
  return (
    <section className="console-empty">
      <h1>This page isn’t here.</h1>
      <p>
        The address may have changed, or the record may belong to another
        workspace.
      </p>
      <Link className="console-button" href="/dashboard">
        Back to your workspace
      </Link>
    </section>
  );
}
