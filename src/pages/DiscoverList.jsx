// src/pages/DiscoverList.jsx
import { useMemo, useState, useEffect } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";
import {
  listDiscoverMerged,
  DISCOVER_CATEGORIES,
  ensureDiscoverReviewer,
  getDiscoverReviewers,
  getDiscoverQuorum
} from "../lib/api/discover.js";
import { getPlaceAverages } from "../lib/api/discoverReviews.js";

function overall(summary) {
  if (!summary?.count) return null;
  const vals = Object.values(summary.averages || {});
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + Number(b || 0), 0) / vals.length;
  return { stars: +mean.toFixed(1), count: summary.count };
}

export default function DiscoverList() {
  const user = getUser();
  const member = isMember();

  useEffect(() => {
    if (user?.city && member) ensureDiscoverReviewer(user.city, user.email || user.name || "user");
  }, [user?.city, member]);

  const [cat, setCat] = useState(""); // "" = All
  const [q, setQ] = useState("");

  const rows = useMemo(() => listDiscoverMerged(user?.city), [user?.city]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter(r => (cat ? (r.category || "Others") === cat : true))
      .filter(r => `${r.name} ${r.description} ${r.address} ${r.locality}`.toLowerCase().includes(qq));
  }, [rows, cat, q]);

  const reviewers = getDiscoverReviewers(user?.city || "Indore");
  const quorum = getDiscoverQuorum(user?.city || "Indore");

  return (
    <Layout>
      <Section title="Discover — City Directory + New">
        <div className="text-[11px] text-[var(--color-muted)] mb-1">
          Reviewers: {reviewers.length} · Quorum: {quorum}
        </div>

        {/* Filters + Add */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCat("")}
            className={`px-3 py-1 rounded-full border ${cat === "" ? "bg-white text-black" : "border-[var(--color-border)]"}`}
          >
            All
          </button>
          {DISCOVER_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1 rounded-full border ${cat === c ? "bg-white text-black" : "border-[var(--color-border)]"}`}
            >
              {c}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, address, locality…"
              className="w-64 md:w-96 px-3 py-2 rounded border border-[var(--color-border)]"
            />
            {member ? (
              <Link
                to="/discover/new"
                className="px-3 py-2 rounded bg-[var(--color-accent)] text-white"
              >
                + Add New Place
              </Link>
            ) : (
              <Link to="/membership" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">
                Become a member
              </Link>
            )}
          </div>
        </div>

        {/* Cards */}
        {filtered.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((r) => {
              const sum = getPlaceAverages(r.id);
              const ov = overall(sum);
              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-[var(--color-muted)]">
                      {r.category} · {r.locality || r.city}
                    </div>
                    <div className="shrink-0">
                      {ov ? (
                        <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-xs ring-1 ring-[var(--color-border)]">
                          <span className="font-semibold">{ov.stars}</span>
                          <span aria-hidden>★</span>
                          <span className="text-[var(--color-muted)]">({ov.count})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-xs ring-1 ring-[var(--color-border)] text-[var(--color-muted)]">
                          No reviews
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold mt-1">{r.name}</h3>
                  {r.description ? <p className="text-sm mt-1 line-clamp-3">{r.description}</p> : null}
                  {r.address ? <p className="text-xs text-[var(--color-muted)] mt-1">{r.address}</p> : null}

                  <div className="mt-3 flex gap-2">
                    <Link to={`/discover/${encodeURIComponent(r.id)}`} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">
                      View
                    </Link>
                    {r.contact ? (
                      <a href={`tel:${r.contact}`} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
                        Call
                      </a>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-[var(--color-muted)]">No places found. Try a different category or search.</div>
        )}
      </Section>
    </Layout>
  );
}
