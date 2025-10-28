// src/pages/Marketplace.jsx
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { deals } from "../lib/data";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";
import { listApprovedListings, ensureMarketplaceReviewer } from "../lib/api/marketplace";

export default function Marketplace() {
  const member = isMember();
  const user = getUser();

  if (user?.city && user?.member) ensureMarketplaceReviewer(user.city, user.email || user.name || "user");

  // Existing demo data
  const topDemo = deals.slice(0, 5);

  // New: approved listings for the user’s city appear first
  const approved = listApprovedListings(user?.city);

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Main 2-up grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Section title="City Listings (Verified)">
            {approved.length ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {approved.map((d) => (
                  <Card key={d.id}>
                    <h3 className="font-semibold">{d.title}</h3>
                    <p className="text-sm text-[var(--color-muted)]">
                      {d.where} {Number.isFinite(d.price) ? `· ₹${d.price}` : ""}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link to="/marketplace" className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                        Contact
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No approved listings yet.</div>
            )}
          </Section>

          <Section title="Hot Deals (Demo)">
            <div className="grid sm:grid-cols-2 gap-3">
              {topDemo.map((d, idx) => (
                <Card key={idx}>
                  <h3 className="font-semibold">{d.title}</h3>
                  <p className="text-sm text-[var(--color-muted)]">{d.where}</p>
                  <div className="mt-3 flex gap-2">
                    <Link to="/marketplace" className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                      Contact
                    </Link>
                    <Link
                      to={`/chat?t=deal&id=${idx}`}
                      className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                    >
                      💬 Chat
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </Section>

          <Section title="Post a Deal">
            {member ? (
              <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
                <div className="text-sm text-[var(--color-muted)] mb-2">
                  Promote your product or service to locals.
                </div>
                <Link
                  to="/submit-deal"
                  className="px-3 py-2 rounded bg-[var(--color-accent)] text-white"
                >
                  + Submit a promotion
                </Link>
              </div>
            ) : (
              <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
                <div className="text-sm">Become a member to post in Marketplace.</div>
                <Link
                  to="/membership"
                  className="mt-2 inline-block px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                >
                  Become a member
                </Link>
              </div>
            )}
          </Section>
        </div>

        {/* Right rail promotions */}
        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Sponsored</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Your ad here. Get visibility across the city.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
