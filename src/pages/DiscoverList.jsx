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
import { getCityAnomalies, flagDiscoverItem } from "../lib/guardrails.js";

// Map pane (added in Sprint 4)
import MapPane from "../components/MapPane";
// NEW: Roles & Badges
import { getEntityBadges } from "../lib/roles";

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
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";

  useEffect(() => {
    if (city && member) ensureDiscoverReviewer(city, user?.email || user?.name || "user");
  }, [city, member, user?.email, user?.name]);

  const [cat, setCat] = useState(""); // "" = All
  const [q, setQ] = useState("");
  const [showMap, setShowMap] = useState(false); // toggle map visibility

  const rows = useMemo(() => listDiscoverMerged(city), [city]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows
      .filter(r => (cat ? (r.category || "Others") === cat : true))
      .filter(r => `${r.name} ${r.description} ${r.address} ${r.locality}`.toLowerCase().includes(qq));
  }, [rows, cat, q]);

  // MARKERS: include fallbacks so MapPane can auto-geocode if lat/lng are missing.
  const markers = useMemo(() => {
    return filtered.map(r => ({
      id: r.id,
      name: r.name,
      lat: r.lat,                   // may be undefined
      lng: r.lng,                   // may be undefined
      address: r.address || "",
      locality: r.locality || "",
      city: r.city || city,         // fallback to current city
      href: `/discover/${encodeURIComponent(r.id)}`
    }));
  }, [filtered, city]);

  const reviewers = getDiscoverReviewers(city);
  const quorum = getDiscoverQuorum(city);

  const anomalies = getCityAnomalies(city); // {riskLevel, messages}

  return (
    <Layout>
      <Section title="Discover — City Directory + New">
        <div className="text-[11px] text-[var(--color-muted)] mb-1">
          Reviewers: {reviewers.length} · Quorum: {quorum}
        </div>

        {/* Anti-manipulation city banner */}
        {anomalies?.riskLevel > 0 && anomalies.messages?.length ? (
          <div className="mb-3 rounded-lg border border-yellow-400/50 bg-yellow-50/60 dark:bg-yellow-900/20 p-3 text-[13px]">
            <div className="font-medium mb-1">Heads up: unusual activity in {city}</div>
            <ul className="list-disc pl-4 space-y-1">
              {anomalies.messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        ) : null}

        {/* Sticky Filters + Add + Map toggle */}
        <div
          className="
            sticky top-14 z-20
            -mx-2 px-2 py-2
            bg-[var(--color-app)]/80
            backdrop-blur supports-[backdrop-filter]:bg-[var(--color-app)]/60
            rounded-md
          "
        >
          <div className="mb-2 flex items-center gap-2 flex-wrap">
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
              <button
                onClick={() => setShowMap(s => !s)}
                className="px-3 py-2 rounded ring-1 ring-[var(--color-border)] text-sm"
                title="Toggle map"
              >
                {showMap ? "Hide Map" : "Show Map"}
              </button>
            </div>
          </div>
        </div>

        {/* Inline map above cards */}
        {showMap && filtered.length ? (
          <div className="mt-3 rounded-xl overflow-hidden ring-1 ring-[var(--color-border)]">
            <MapPane markers={markers} fitBoundsPadding={40} />
          </div>
        ) : null}

        {/* Cards */}
        {filtered.length ? (
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((r) => {
              const sum = getPlaceAverages(r.id);
              const ov = overall(sum);
              const flags = flagDiscoverItem(r, city); // {warnings,badges}
              const roleBadges = getEntityBadges("discover", r); // NEW

              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-[var(--color-muted)]">
                      {r.category} · {r.locality || r.city}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {roleBadges.map((b) => (
                        <span key={`role-${b}`} className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] ring-1 ring-[var(--color-border)]">
                          {b}
                        </span>
                      ))}
                      {flags.badges?.map((b) => (
                        <span key={b} className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] ring-1 ring-[var(--color-border)]">
                          {b}
                        </span>
                      ))}
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
          <div className="mt-3 text-sm text-[var(--color-muted)]">No places found. Try a different category or search.</div>
        )}
      </Section>
    </Layout>
  );
}
