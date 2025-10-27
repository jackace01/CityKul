// src/pages/Events.jsx
import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import Section from "../components/Section";
import { Link } from "react-router-dom";
import { isMember } from "../lib/auth";
import BecomeMemberButton from "../components/BecomeMemberButton";
import { listApprovedEvents } from "../lib/api/events";

function toDate(e) {
  // Try to build a Date from event.date + event.time; fall back to createdAt
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

  // pull approved events and sort by soonest (upcoming-first)
  const approved = useMemo(() => {
    const arr = listApprovedEvents();
    return [...arr].sort((a, b) => toDate(a) - toDate(b));
  }, []);

  // quick text filter
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return approved.filter((e) =>
      `${e.name} ${e.category} ${e.place}`.toLowerCase().includes(qq)
    );
  }, [approved, q]);

  // Top 5 upcoming (date asc)
  const topFive = filtered.slice(0, 5);

  // Build category map for the rest (excluding ones already in top)
  const rest = filtered.slice(5);
  const byCat = useMemo(() => {
    const map = {};
    for (const e of rest) {
      const k = e.category || "General";
      if (!map[k]) map[k] = [];
      if (map[k].length < 6) map[k].push(e); // show up to 6 per category
    }
    return map;
  }, [rest]);

  const catKeys = Object.keys(byCat).sort((a, b) => a.localeCompare(b));

  return (
    <Layout>
      <Section title="Upcoming Events">
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
            <BecomeMemberButton label="Become a member" />
          )}
        </div>

        {/* Top 5 upcoming */}
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2">Top 5 Upcoming</div>
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
                  {e.fee && (
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                      Fee: {e.fee}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Link
                      to={`/event/${encodeURIComponent(e.id)}`}
                      className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                    >
                      Details
                    </Link>
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
                        <Link
                          to={`/event/${encodeURIComponent(e.id)}`}
                          className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                        >
                          Details
                        </Link>
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
