// src/pages/Review.jsx
// Reviewer dashboard with weighted quorum (engine v2).
// Keeps your previous queues (Events, Marketplace, Jobs) + Discover + Rentals.

import Layout from "../components/Layout";
import Section from "../components/Section";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";

import {
  listPendingEvents,
  voteEvent,
  getEventReviewers,
  getEventQuorum
} from "../lib/api/events";

import {
  listPendingListings,
  voteListing,
  getMarketplaceReviewers,
  getMarketplaceQuorum
} from "../lib/api/marketplace";

import {
  listPendingJobs,
  voteJob,
  getJobsReviewers,
  getJobsQuorum
} from "../lib/api/jobs";

import {
  listPendingDiscover,
  voteDiscover,
  getDiscoverReviewers,
  getDiscoverQuorum
} from "../lib/api/discover";

import {
  listPendingRentals,
  voteRental,
  getRentalsReviewers,
  getRentalsQuorum
} from "../lib/api/rentals";

function ModuleQueue({
  title,
  rows,
  onApprove,
  onReject,
  quorumText,
  emptyText,
  getPreviewPath
}) {
  return (
    <Section title={title}>
      <div className="text-[11px] text-[var(--color-muted)] mb-2">
        {quorumText} <span className="opacity-70">· Weighted approvals enabled</span>
      </div>

      {rows.length ? (
        <div className="space-y-3">
          {rows.map((q) => {
            const previewPath = typeof getPreviewPath === "function" ? getPreviewPath(q) : null;
            return (
              <div
                key={q.id}
                className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4"
              >
                <div className="text-xs text-[var(--color-muted)]">
                  📍 {q.city || "City"}
                  {q.location ? ` · ${q.location}` : ""}
                  {q.locality ? ` · ${q.locality}` : ""}
                  {q.where ? ` · ${q.where}` : ""}
                </div>

                <h3 className="font-semibold">{q.name || q.title}</h3>

                <div className="text-sm text-[var(--color-muted)]">
                  {q.date ? `${q.date}` : ""}
                  {q.time ? ` · ${q.time}` : ""}
                  {q.place ? ` · ${q.place}` : ""}
                  {q.org ? ` · ${q.org}` : ""}
                  {q.price ? ` · Price: ${q.price}` : ""}
                </div>

                {q.address ? (
                  <div className="text-xs text-[var(--color-muted)] mt-1">{q.address}</div>
                ) : null}
                {q.description ? (
                  <p className="text-sm mt-2">{q.description}</p>
                ) : null}

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

                  {previewPath ? (
                    <Link
                      to={previewPath}
                      className="ml-auto px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
                    >
                      Preview
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-[var(--color-muted)]">{emptyText}</div>
      )}
    </Section>
  );
}

export default function Review() {
  const u = getUser();
  const member = isMember();
  const city = u?.city || localStorage.getItem("citykul:city") || "Indore";
  const reviewerId = u?.email || u?.name || "user";

  const [tick, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const evRows   = useMemo(() => listPendingEvents(city),   [tick, city]);
  const mpRows   = useMemo(() => listPendingListings(city), [tick, city]);
  const jobRows  = useMemo(() => listPendingJobs(city),     [tick, city]);
  const discRows = useMemo(() => listPendingDiscover(city), [tick, city]);
  const rentRows = useMemo(() => listPendingRentals(city),  [tick, city]);

  const evQuorum   = `${getEventReviewers(city).length} reviewers · Quorum ${getEventQuorum(city)}`;
  const mpQuorum   = `${getMarketplaceReviewers(city).length} reviewers · Quorum ${getMarketplaceQuorum(city)}`;
  const jobQuorum  = `${getJobsReviewers(city).length} reviewers · Quorum ${getJobsQuorum(city)}`;
  const discQuorum = `${getDiscoverReviewers(city).length} reviewers · Quorum ${getDiscoverQuorum(city)}`;
  const rentQuorum = `${getRentalsReviewers(city).length} reviewers · Quorum ${getRentalsQuorum(city)}`;

  function needMember() {
    return (
      <div className="text-sm">
        You need to be a member to access the review queue.{" "}
        <Link to="/membership" className="text-[var(--color-accent)] underline">
          Become a member
        </Link>
      </div>
    );
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Reviewer Dashboard">
            <div className="text-sm text-[var(--color-muted)]">City: <b>{city}</b></div>
          </Section>

          {!member ? (
            <Section title="Review Queue">{needMember()}</Section>
          ) : (
            <>
              <ModuleQueue
                title="Events — Pending"
                rows={evRows}
                quorumText={evQuorum}
                emptyText="No events pending review."
                onApprove={(id) => { voteEvent(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteEvent(id, reviewerId, false); refresh(); }}
                getPreviewPath={(q) => `/event/${q.id}`}
              />
              <ModuleQueue
                title="Marketplace — Pending"
                rows={mpRows}
                quorumText={mpQuorum}
                emptyText="No listings pending review."
                onApprove={(id) => { voteListing(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteListing(id, reviewerId, false); refresh(); }}
                getPreviewPath={() => "/marketplace"}
              />
              <ModuleQueue
                title="Jobs — Pending"
                rows={jobRows}
                quorumText={jobQuorum}
                emptyText="No jobs pending review."
                onApprove={(id) => { voteJob(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteJob(id, reviewerId, false); refresh(); }}
                getPreviewPath={() => "/jobs"}
              />
              <ModuleQueue
                title="Discover — Pending"
                rows={discRows}
                quorumText={discQuorum}
                emptyText="No Discover entries pending review."
                onApprove={(id) => { voteDiscover(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteDiscover(id, reviewerId, false); refresh(); }}
                getPreviewPath={(q) => `/discover/${q.id}`}
              />
              <ModuleQueue
                title="Local Rentals — Pending"
                rows={rentRows}
                quorumText={rentQuorum}
                emptyText="No rentals pending review."
                onApprove={(id) => { voteRental(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteRental(id, reviewerId, false); refresh(); }}
                getPreviewPath={(q) => `/rentals/${q.id}`}
              />
            </>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Tip</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Approvals are weighted by reviewer reputation. Quorum adapts to active participation.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
