// src/pages/RentalList.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, isMember } from "../lib/auth";
import {
  listApprovedRentals,
  RENTAL_CATEGORIES,
  isAvailable,
  ensureRentalsReviewer,
  getRentalsReviewers,
  getRentalsQuorum
} from "../lib/api/rentals";
import { useChat } from "../components/ChatProvider";
import { getCityAnomalies, flagRentalItem } from "../lib/guardrails.js";

// Map pane (added in Sprint 4)
import MapPane from "../components/MapPane";
// NEW: Roles & Badges
import { getEntityBadges } from "../lib/roles";

export default function Rentals() {
  const user = getUser();
  const member = isMember();
  const city = user?.city || localStorage.getItem("citykul:city") || "Indore";
  const { openChat } = useChat();

  useEffect(() => {
    if (member && city) {
      const rid = user?.email || user?.name || "user";
      try { ensureRentalsReviewer(city, rid); } catch {}
    }
  }, [member, city, user?.email, user?.name]);

  const rows = useMemo(() => listApprovedRentals(city), [city]);

  const [cat, setCat] = useState(""); // "" = All
  const [q, setQ] = useState("");
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [showMap, setShowMap] = useState(false); // toggle map visibility

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesCat = cat ? (r.category || "Miscellaneous") === cat : true;
      const matchesText = `${r.title} ${r.description} ${r.address} ${r.locality}`.toLowerCase().includes(qq);
      const matchesAvail = !onlyAvail
        ? true
        : (start && end ? isAvailable(r, start, end) : true);
      return matchesCat && matchesText && matchesAvail;
    });
  }, [rows, cat, q, onlyAvail, start, end]);

  // MARKERS: include fallbacks so MapPane can auto-geocode if lat/lng are missing.
  const markers = useMemo(() => {
    return filtered.map(r => ({
      id: r.id,
      name: r.title,
      lat: r.lat,                  // may be undefined
      lng: r.lng,                  // may be undefined
      address: r.address || "",
      locality: r.locality || "",
      city: r.city || city,        // fallback to current city
      href: `/rentals/${encodeURIComponent(r.id)}`
    }));
  }, [filtered, city]);

  const reviewers = getRentalsReviewers(city);
  const quorum = getRentalsQuorum(city);

  const anomalies = getCityAnomalies(city);

  return (
    <Layout>
      <Section title="Local Rentals">
        <div className="text-[11px] text-[var(--color-muted)] mb-1">
          Reviewers: {reviewers.length} · Quorum: {quorum}
        </div>

        {anomalies?.riskLevel > 0 && anomalies.messages?.length ? (
          <div className="mb-3 rounded-lg border border-yellow-400/50 bg-yellow-50/60 dark:bg-yellow-900/20 p-3 text-[13px]">
            <div className="font-medium mb-1">Heads up: unusual activity in {city}</div>
            <ul className="list-disc pl-4 space-y-1">
              {anomalies.messages.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        ) : null}

        {/* Sticky Filters (includes Availability) */}
        <div
          className="
            sticky top-14 z-20
            -mx-2 px-2 py-2
            bg-[var(--color-app)]/80
            backdrop-blur supports-[backdrop-filter]:bg-[var(--color-app)]/60
            rounded-md
          "
        >
          {/* Category + search + add + map toggle */}
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCat("")}
              className={`px-3 py-1 rounded-full border ${cat === "" ? "bg-white text-black" : "border-[var(--color-border)]"}`}
            >
              All
            </button>
            {RENTAL_CATEGORIES.map((c) => (
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
                placeholder="Search title, address, locality…"
                className="w-64 md:w-96 px-3 py-2 rounded border border-[var(--color-border)]"
              />
              {member ? (
                <Link to="/rentals/new" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">
                  + Post Rental
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

          {/* Availability filter (sticky with the rest) */}
          <div className="flex flex-wrap items-end gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyAvail}
                onChange={(e) => setOnlyAvail(e.target.checked)}
              />
              Only show available for:
            </label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="px-3 py-2 rounded border border-[var(--color-border)]"
            />
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="px-3 py-2 rounded border border-[var(--color-border)]"
            />
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
              const flags = flagRentalItem(r, city);
              const roleBadges = getEntityBadges("rental", r); // NEW
              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs text-[var(--color-muted)]">
                      {r.category} · {r.locality || r.city}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] ring-1 ring-[var(--color-border)]">
                        💠 Escrow
                      </span>
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
                    </div>
                  </div>
                  <h3 className="font-semibold mt-1">{r.title}</h3>
                  {r.description ? <p className="text-sm mt-1 line-clamp-3">{r.description}</p> : null}
                  <div className="text-sm mt-2">
                    Price: <span className="font-semibold">{r.price}</span> / {r.pricePer}
                    {r.deposit ? <span className="text-[var(--color-muted)]"> · Deposit {r.deposit}</span> : null}
                  </div>
                  {r.address ? <div className="text-xs text-[var(--color-muted)] mt-1">{r.address}</div> : null}

                  <div className="mt-3 flex gap-2">
                    <Link to={`/rentals/${encodeURIComponent(r.id)}`} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">
                      View
                    </Link>
                    <button
                      onClick={() => openChat({ to: r.ownerId || "City Chat" })}
                      className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                    >
                      💬 Chat
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 text-sm text-[var(--color-muted)]">No rentals found. Try changing filters.</div>
        )}
      </Section>
    </Layout>
  );
}
