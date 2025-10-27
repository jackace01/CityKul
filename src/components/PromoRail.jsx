// src/components/PromoRail.jsx
import { promotions } from "../lib/data";
import { Link } from "react-router-dom";
import { isMember } from "../lib/auth";

export default function PromoRail() {
  const member = isMember();
  return (
    <aside className="space-y-3">
      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
        <div className="text-sm font-semibold mb-2">Sponsored</div>
        <div className="space-y-2">
          {promotions.map((p, idx) => (
            <div
              key={idx}
              className="rounded-lg p-3 ring-1 ring-[var(--color-border)] bg-[var(--color-bg)]/60"
            >
              <div className="text-sm font-medium">{p.title}</div>
              <div className="text-xs text-[var(--color-muted)]">{p.org}</div>
              <button className="mt-2 text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white">
                Learn more
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
        <div className="text-sm font-semibold">Promote your business</div>
        <p className="text-xs text-[var(--color-muted)] mt-1">
          Get seen on every page in your city.
        </p>
        {member ? (
          <Link
            to="/submit-deal"
            className="mt-2 inline-block text-xs px-2 py-1 rounded bg-[var(--color-accent)] text-white"
          >
            + Submit a promotion
          </Link>
        ) : (
          <Link
            to="/membership"
            className="mt-2 inline-block text-xs px-2 py-1 rounded ring-1 ring-[var(--color-border)]"
          >
            Become a member
          </Link>
        )}
      </div>
    </aside>
  );
}
