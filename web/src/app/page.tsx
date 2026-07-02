import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="home-card clip-card">
        <img src="/assets/images/vitapharm.png" alt="Vitapharm" className="home-logo" />
        <h1 className="home-title">
          Inventory built for <span className="serif">speed.</span>
        </h1>
        <p className="home-copy">
          Next.js frontend wired to your existing Vitastore API for instant dashboard responses.
        </p>
        <div className="home-actions">
          <Link href="/login" className="btn btn-primary">
            Sign in
          </Link>
          <Link href="/dashboard" className="btn btn-outline">
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
