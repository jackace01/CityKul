// src/pages/Review.jsx
// Reviewer dashboard with weighted quorum (engine v2) + transparency.
// Keeps your previous queues + adds Promotions.

import Layout from "../components/Layout";
import Section from "../components/Section";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";

// Existing queues
import {
  listPendingEvents,
  voteEvent,
  getEventReviewers,
} from "../lib/api/events";

import {
  listPendingListings,
  voteListing,
  getMarketplaceReviewers,
} from "../lib/api/marketplace";

import {
  listPendingJobs,
  voteJob,
  getJobsReviewers,
} from "../lib/api/jobs";

import {
  listPendingDiscover,
  voteDiscover,
  getDiscoverReviewers,
} from "../lib/api/discover";

import {
  listPendingRentals,
  voteRental,
  getRentalsReviewers,
} from "../lib/api/rentals";

// NEW: contests
import {
  listPendingContests,
  voteContest,
  getContestReviewers,
} from "../lib/api/contests.js";

// NEW: promotions
import {
  listPendingPromotions,
  votePromotion,
  ensurePromoReviewer,
} from "../lib/api/promotions";

// Weighted quorum metrics + vote box
import { quorumInfo, getVotesBox } from "../lib/review";

// ---------- Small inline visual for transparency ----------
function QuorumMini({ info, label }) {
  if (!info) return null;
  const pctLabel = Math.round(info.targetPercent * 100);
  const quorumCountApprox = Math.max(1, Math.ceil((info.totalReviewers || 0) * info.targetPercent));
  const activePct = Math.round((info.activeRate || 0) * 100);
  return (
    <div className="text-[11px] text-[var(--color-muted)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{label}</span>
        <span>· {info.totalReviewers} reviewer(s)</span>
        <span>· Quorum ≈ {quorumCountApprox} ({pctLabel}%)</span>
        <span>· Active {activePct}% in last {info.windowDays}d</span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden max-w-sm">
        <div className="h-1.5" style={{ width: `${activePct}%`, background: "var(--color-accent)" }} aria-hidden />
      </div>
    </div>
  );
}

function ModuleQueue({ title, rows, onApprove, onReject, quorumNode, emptyText, getPreviewPath }) {
  return (
    <Section title={title}>
      <div className="mb-2">{quorumNode}</div>
      {rows.length ? (
        <div className="space-y-3">
          {rows.map((q) => {
            const previewPath = typeof getPreviewPath === "function" ? getPreviewPath(q) : null;
            let approveCount = 0, rejectCount = 0;
            try {
              const vb = getVotesBox(q.id);
              approveCount = (vb.approvals || []).length;
              rejectCount = (vb.rejections || []).length;
            } catch {}
            return (
              <div key={q.id} className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
                <div className="text-xs text-[var(--color-muted)]">
                  📍 {q.city || "City"} {q?.data?.target?.locality ? ` · ${q.data.target.locality}` : ""}
                </div>
                <h3 className="font-semibold">{q?.data?.title || q.title}</h3>
                {q?.data?.description ? <p className="text-sm mt-2">{q.data.description}</p> : null}
                <div className="mt-1 text-xs text-[var(--color-muted)]">
                  Slot: <b>{q?.data?.slot?.toUpperCase() || "RAIL"}</b> · Dates: {q?.data?.startDate} → {q?.data?.endDate}
                </div>

                <div className="mt-2 text-[11px] text-[var(--color-muted)] flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full ring-1 ring-[var(--color-border)]">👍 Approvals: <b>{approveCount}</b></span>
                  <span className="px-2 py-0.5 rounded-full ring-1 ring-[var(--color-border)]">👎 Rejections: <b>{rejectCount}</b></span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => onApprove(q.id)} className="px-3 py-1 rounded bg-green-600 text-white">Approve</button>
                  <button onClick={() => onReject(q.id)} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                  {previewPath ? (
                    <Link to={previewPath} className="ml-auto px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Preview</Link>
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

  // Make sure the viewer becomes a promotions reviewer automatically (safe no-op)
  try { ensurePromoReviewer(city, reviewerId); } catch {}

  const evRows   = useMemo(() => listPendingEvents(city),      [tick, city]);
  const mpRows   = useMemo(() => listPendingListings(city),    [tick, city]);
  const jobRows  = useMemo(() => listPendingJobs(city),        [tick, city]);
  const discRows = useMemo(() => listPendingDiscover(city),    [tick, city]);
  const rentRows = useMemo(() => listPendingRentals(city),     [tick, city]);
  const conRows  = useMemo(() => listPendingContests(city),    [tick, city]);
  const proRows  = useMemo(() => listPendingPromotions(city),  [tick, city]);

  const evInfo   = useMemo(() => quorumInfo(city, "events"),       [city, tick]);
  const mpInfo   = useMemo(() => quorumInfo(city, "marketplace"),  [city, tick]);
  const jobInfo  = useMemo(() => quorumInfo(city, "jobs"),         [city, tick]);
  const discInfo = useMemo(() => quorumInfo(city, "discover"),     [city, tick]);
  const rentInfo = useMemo(() => quorumInfo(city, "rentals"),      [city, tick]);
  const conInfo  = useMemo(() => quorumInfo(city, "contests"),     [city, tick]);
  const proInfo  = useMemo(() => quorumInfo(city, "promotions"),   [city, tick]);

  function needMember() {
    return (
      <div className="text-sm">
        You need to be a member to access the review queue{" "}
        <Link to="/membership" className="text-[var(--color-accent)] underline">Become a member</Link>
      </div>
    );
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Reviewer Dashboard">
            <div className="text-sm text-[var(--color-muted)]">City: <b>{city}</b></div>
            <div className="mt-2 text-xs text-[var(--color-muted)]">Approvals are reputation-weighted. Quorum adapts to active reviewer participation.</div>
          </Section>

          {!member ? (
            <Section title="Review Queue">{needMember()}</Section>
          ) : (
            <>
              <ModuleQueue
                title={`Events — Pending (${evRows.length})`}
                rows={evRows}
                quorumNode={<QuorumMini info={evInfo} label="Events quorum" />}
                emptyText="No events pending review."
                onApprove={(id) => { voteEvent(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteEvent(id, reviewerId, false); refresh(); }}
                getPreviewPath={(q) => `/event/${q.id}`}
              />
              <ModuleQueue
                title={`Marketplace — Pending (${mpRows.length})`}
                rows={mpRows}
                quorumNode={<QuorumMini info={mpInfo} label="Marketplace quorum" />}
                emptyText="No listings pending review."
                onApprove={(id) => { voteListing(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteListing(id, reviewerId, false); refresh(); }}
                getPreviewPath={() => "/marketplace"}
              />
              <ModuleQueue
                title={`Jobs — Pending (${jobRows.length})`}
                rows={jobRows}
                quorumNode={<QuorumMini info={jobInfo} label="Jobs quorum" />}
                emptyText="No jobs pending review."
                onApprove={(id) => { voteJob(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteJob(id, reviewerId, false); refresh(); }}
                getPreviewPath={() => "/jobs"}
              />
              <ModuleQueue
                title={`Discover — Pending (${discRows.length})`}
                rows={discRows}
                quorumNode={<QuorumMini info={discInfo} label="Discover quorum" />}
                emptyText="No Discover entries pending review."
                onApprove={(id) => { voteDiscover(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteDiscover(id, reviewerId, false); refresh(); }}
                getPreviewPath={(q) => `/discover/${q.id}`}
              />
              <ModuleQueue
                title={`Local Rentals — Pending (${rentRows.length})`}
                rows={rentRows}
                quorumNode={<QuorumMini info={rentInfo} label="Rentals quorum" />}
                emptyText="No rentals pending review."
                onApprove={(id) => { voteRental(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteRental(id, reviewerId, false); refresh(); }}
                getPreviewPath={(q) => `/rentals/${q.id}`}
              />
              <ModuleQueue
                title={`Contests — Pending (${conRows.length})`}
                rows={conRows}
                quorumNode={<QuorumMini info={conInfo} label="Contests quorum" />}
                emptyText="No contest entries pending review."
                onApprove={(id) => { voteContest(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { voteContest(id, reviewerId, false); refresh(); }}
                getPreviewPath={(q) => `/contests/${q.id}`}
              />
              {/* NEW: Promotions */}
              <ModuleQueue
                title={`Promotions — Pending (${proRows.length})`}
                rows={proRows}
                quorumNode={<QuorumMini info={proInfo} label="Promotions quorum" />}
                emptyText="No promotions pending review."
                onApprove={(id) => { votePromotion(id, reviewerId, true);  refresh(); }}
                onReject={(id)  => { votePromotion(id, reviewerId, false); refresh(); }}
                getPreviewPath={() => "/promotions"}
              />
            </>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Tip</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              “Active %” looks at unique reviewers who voted in the last {evInfo?.windowDays ?? 14} days.
              Quorum target rises with participation (60–80%).
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
