// src/pages/AdminHub.jsx
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, isMember } from "../lib/auth";

function HubCard({ title, desc, actions = [] }) {
  return (
    <Card>
      <div className="space-y-1">
        <div className="font-semibold">{title}</div>
        {desc ? <div className="text-sm text-[var(--color-muted)]">{desc}</div> : null}
      </div>
      {!!actions.length && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((a, i) => (
            <Link
              key={i}
              to={a.to}
              className={`text-sm px-3 py-1 rounded ${a.primary ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function AdminHub() {
  const u = getUser();
  const member = isMember();

  return (
    <Layout>
      <Section title="Admin Hub">
        <div className="text-sm text-[var(--color-muted)]">
          {u ? (
            <>
              Signed in as <b>{u.name || u.email || "User"}</b>
              {!member && (
                <>
                  {" · "}
                  <Link to="/membership" className="underline">Become a member</Link> to access reviewer features.
                </>
              )}
            </>
          ) : (
            <>
              You’re not logged in. <Link to="/login" className="underline">Login</Link> to access admin tools.
            </>
          )}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Governance & Moderation */}
          <HubCard
            title="Governance & Moderation"
            desc="Community review, government notices, and audit trails."
            actions={[
              { label: "Reviewer Dashboard", to: "/review", primary: true },
              { label: "Publish Admin Notice", to: "/admin-notices" },
            ]}
          />

          {/* Finance & Accounting */}
          <HubCard
            title="Finance & Accounting"
            desc="Read-only platform wallet with CSV export and reconciliation."
            actions={[
              { label: "Platform Wallet (Finance)", to: "/admin/finance", primary: true },
            ]}
          />

          {/* Programs & Awards */}
          <HubCard
            title="Programs & Awards"
            desc="City Hero spotlight and monthly community contests."
            actions={[
              { label: "City Hero", to: "/city-hero", primary: true },
              { label: "City Hero (Legacy)", to: "/city-hero/legacy" },
              { label: "Contests", to: "/contests" },
            ]}
          />

          {/* Marketing & Monetization */}
          <HubCard
            title="Marketing & Monetization"
            desc="Promotions/ads rail and business submissions."
            actions={[
              { label: "Promotions Gallery", to: "/promotions", primary: true },
              { label: "Submit a Promotion", to: "/submit-deal" },
            ]}
          />

          {/* Directory & Safety */}
          <HubCard
            title="Directory & Safety"
            desc="People directory and safety center."
            actions={[
              { label: "People Directory", to: "/people", primary: true },
              { label: "Safety Center", to: "/safety" },
            ]}
          />

          {/* System & Utilities */}
          <HubCard
            title="System & Utilities"
            desc="Settings, notifications, and per-city tuning."
            actions={[
              { label: "Notifications", to: "/notifications", primary: true },
              { label: "Settings", to: "/settings" },
              { label: "Admin Config (Knobs)", to: "/admin/config" },
            ]}
          />
        </div>

        <div className="mt-6 text-xs text-[var(--color-muted)]">
          Note: The <b>Moderation Log</b> is inside <i>Publish Admin Notice</i> as a second tab.
        </div>
      </Section>
    </Layout>
  );
}
