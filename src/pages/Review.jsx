// src/pages/Review.jsx
import Layout from "../components/Layout";
import Section from "../components/Section";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listAllEvents, approveEvent, getEventById } from "../lib/api/events";
import { addPoints } from "../lib/api/wallet";
import { addNotification } from "../lib/api/notifications";
import { getUser, isMember } from "../lib/auth";

export default function Review() {
  const u = getUser();
  const member = isMember();

  // Pull pending items (for now, events requiring approval)
  const [tick, setTick] = useState(0);
  const pending = useMemo(() => {
    const all = listAllEvents();
    return all.filter((e) => !e.approved);
  }, [tick]);

  function refresh() {
    setTick((t) => t + 1);
  }

  function onApprove(id) {
    const ev = getEventById(id);
    approveEvent(id);

    // Reward the creator if we have an owner id (email recommended)
    if (ev?.ownerId) {
      addPoints(ev.ownerId, 20, `Event approved: ${ev.name}`);
      addNotification({
        toUserId: ev.ownerId,
        title: "Your event was approved 🎉",
        body: `“${ev.name}” is now visible to everyone.`,
        link: `/event/${id}`,
      });
    }
    refresh();
    alert("Approved!");
  }

  function onReject(id) {
    const ev = getEventById(id);
    if (ev?.ownerId) {
      addNotification({
        toUserId: ev.ownerId,
        title: "Your event needs changes",
        body: `“${ev.name}” was not approved. Please review details and resubmit.`,
        link: `/submit-event`,
      });
    }
    // We simply leave it unapproved in this mock; you could also remove it here.
    refresh();
    alert("Rejected (mock).");
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Validator Review Queue">
            {!member ? (
              <div className="text-sm">
                You need to be a member to access the review queue.{" "}
                <Link to="/membership" className="text-[var(--color-accent)] underline">
                  Become a member
                </Link>
              </div>
            ) : pending.length ? (
              <div className="space-y-3">
                {pending.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4"
                  >
                    <div className="text-xs text-[var(--color-muted)]">
                      📍 {q.city || "City"}{q.locality ? ` - ${q.locality}` : ""}
                    </div>
                    <div className="text-sm text-[var(--color-muted)]">
                      Category: {q.category || "Event"}
                    </div>
                    <h3 className="font-semibold">{q.name}</h3>
                    <div className="text-sm text-[var(--color-muted)]">
                      {q.date}{q.time ? ` · ${q.time}` : ""} {q.fee ? `· ${q.fee}` : ""}
                    </div>
                    {q.venue && (
                      <div className="text-xs text-[var(--color-muted)] mt-1">Venue: {q.venue}</div>
                    )}
                    {q.description && <p className="text-sm mt-2">{q.description}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => onApprove(q.id)}
                        className="px-3 py-1 rounded bg-green-600 text-white"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => onReject(q.id)}
                        className="px-3 py-1 rounded bg-red-600 text-white"
                      >
                        Reject
                      </button>
                      <Link
                        to={`/event/${q.id}`}
                        className="ml-auto px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                      >
                        Preview
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[var(--color-muted)]">No items pending review.</div>
            )}
          </Section>

          <Section title="Review Guidelines">
            <ul className="list-disc pl-5 text-sm space-y-1">
              <li>Check title, timing, venue, and description clarity.</li>
              <li>Look for duplicate or misleading events.</li>
              <li>Prefer posts with at least one clear image.</li>
              <li>Reject spam, scams, or unverifiable claims.</li>
            </ul>
          </Section>
        </div>

        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Tip</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              When in doubt, ask the organizer for more details via the event chat before rejecting.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
