// src/pages/Events.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import Section from "../components/Section";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";

import {
  listApprovedEvents,
  ensureEventReviewer,
  getEventReviewers,
  getEventQuorum,
} from "../lib/api/events";

import { bump, score } from "../lib/engagement";

function toDate(e) {
  try {
    if (e.date) {
      const iso = e.time ? `${e.date}T${e.time}` : `${e.date}T00:00`;
      return new Date(iso);
    }
  } catch {}
  return new Date(e.createdAt || Date.now());
}

export default function Events() {
  const [q, setQ] = useState("");
  const member = isMember();
  const user = getUser();

  // Ensure current user (if member) is registered as reviewer for their city (so they can vote via Review page if assigned)
  useEffect(() => {
    if (user?.city && user?.member) ensureEventReviewer(user.city, user.email || user.name || "user");
  }, [user?.city, user?.member]);

  const approved = useMemo(() => {
    const arr = listApprovedEvents(user?.city);
    // keep upcoming first
    return [...arr].sort((a, b) => toDate(a) - toDate(b));
  }, [user?.city]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return approved.filter((e) =>
      `${e.name} ${e.category} ${e.place}`.toLowerCase().includes(qq)
    );
  }, [approved, q]);

  // ENGAGEMENT-BASED TOP 5 (not just upcoming)
  const ranked = [...filtered].sort((a, b) => score(b.id) - score(a.id));
  const topFive = ranked.slice(0, 5);

  // Group rest by category
  const rest = filtered.filter((e) => !topFive.find((t) => t.id === e.id));
  const byCat = useMemo(() => {
    const map = {};
    for (const e of rest) {
      const k = e.category || "General";
      if (!map[k]) map[k] = [];
      if (map[k].length < 6) map[k].push(e);
    }
    return map;
  }, [rest]);
  const catKeys = Object.keys(byCat).sort((a, b) => a.localeCompare(b));

  // Display quorum info (optional helper line)
  const reviewers = getEventReviewers(user?.city || "Indore");
  const quorum = getEventQuorum(user?.city || "Indore");

  return (
    <Layout>
      <Section title="Upcoming Events">
        <div className="mb-2 text-[11px] text-[var(--color-muted)]">
          Reviewers in {user?.city || "your city"}: {reviewers.length} · Quorum: {quorum}
        </div>

        {/* Search + Add Event */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events, venues, categories…"
            className="w-full md:w-80 px-3 py-2 rounded bg-white dark:bg-gray-900 border border-[var(--color-border)] text-black dark:text-white"
          />
          {member ? (
            <Link
              to="/submit-event"
              className="px-3 py-2 rounded bg-[var(--color-accent)] text-white"
            >
              + Add Event
            </Link>
          ) : (
            <Link to="/membership" className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">
              Become a member
            </Link>
          )}
        </div>

        {/* Top 5 by engagement */}
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2">Top 5 (by engagement)</div>
          {topFive.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {topFive.map((e) => (
                <Card key={e.id}>
                  <h3 className="font-semibold">{e.name}</h3>
                  <p className="text-xs text-[var(--color-muted)]">
                    {(e.date || "").toString()}
                    {e.time ? ` · ${e.time}` : ""} {e.place ? `· ${e.place}` : ""}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] mt-1">
                    Category: {e.category || "General"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white" onClick={() => bump(e.id, "likes")}>Like</button>
                    <button className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]" onClick={() => bump(e.id, "shares")}>Share</button>
                    <button className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]" onClick={() => bump(e.id, "comments")}>Comment</button>
                    <button className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]" onClick={() => bump(e.id, "interests")}>Interested</button>
                    <Link to={`/event/${encodeURIComponent(e.id)}`} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Details</Link>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">
              No approved events yet. Submit one and approve it from the Review page.
            </div>
          )}
        </div>

        {/* Categorized sections */}
        {catKeys.length ? (
          <div className="space-y-6">
            {catKeys.map((cat) => (
              <div key={cat}>
                <div className="text-sm font-semibold mb-2">{cat}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {byCat[cat].map((e) => (
                    <Card key={e.id}>
                      <h3 className="font-semibold">{e.name}</h3>
                      <p className="text-xs text-[var(--color-muted)]">
                        {(e.date || "").toString()}
                        {e.time ? ` · ${e.time}` : ""} {e.place ? `· ${e.place}` : ""}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white" onClick={() => bump(e.id, "likes")}>Like</button>
                        <Link to={`/event/${encodeURIComponent(e.id)}`} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Details</Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Section>
    </Layout>
  );
}
