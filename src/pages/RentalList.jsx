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

  const reviewers = getRentalsReviewers(city);
  const quorum = getRentalsQuorum(city);

  return (
    <Layout>
      <Section title="Local Rentals">
        <div className="text-[11px] text-[var(--color-muted)] mb-1">
          Reviewers: {reviewers.length} · Quorum: {quorum}
        </div>

        {/* Filters */}
        <div className="mb-3 flex items-center gap-2 flex-wrap">
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
          </div>
        </div>

        {/* Availability filter */}
        <div className="mb-4 flex flex-wrap items-end gap-2">
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

        {/* Cards */}
        {filtered.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((r) => (
              <Card key={r.id}>
                <div className="text-xs text-[var(--color-muted)]">
                  {r.category} · {r.locality || r.city}
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
            ))}
          </div>
        ) : (
          <div className="text-sm text-[var(--color-muted)]">No rentals found. Try changing filters.</div>
        )}
      </Section>
    </Layout>
  );
}
