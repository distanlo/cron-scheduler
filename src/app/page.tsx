import { Dashboard } from "@/components/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dbConfigured = Boolean(process.env.DATABASE_URL);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container row between">
          <div className="brand-wrap">
            <span className="brand">CRON AGENT</span>
            <span className="tag">Discord Delivery Scheduler</span>
          </div>
          <span className="status">ONLINE</span>
        </div>
      </header>
      <div className="container page-body">
        <Dashboard dbConfigured={dbConfigured} />
      </div>
    </main>
  );
}
