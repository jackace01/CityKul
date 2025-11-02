// src/pages/Review.jsx
// Reviewer dashboard with weighted quorum (DWQM) + transparency & explainer.
// Queues: Events, Marketplace, Jobs, Discover, Rentals.

import Layout from "../components/Layout";
import Section from "../components/Section";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";

// Per-module queues/actions
import { listPendingEvents, voteEvent } from "../lib/api/events";
import { listPendingListings, voteListing } from "../lib/api/marketplace";
import { listPendingJobs, voteJob } from "../lib/api/jobs";
import { listPendingDiscover, voteDiscover } from "../lib/api/discover";
import { listPendingRentals, voteRental } from "../lib/api/rentals";

// Transparency (weighted quorum metrics + votes box)
import { quorumInfo, getVotesBox } from "../lib/review";

// ---------- Small inline visual for transparency ----------
function QuorumMini({ info, label }) {
  if (!info) return null;
  const pctLabel = Math.round((info.targetPercent || 0) * 100);
  const quorumCountApprox = Math.max(
    1,
    Math.ceil((info.totalReviewers || 0) * (info.targetPercent || 0))
  );
  const activePct = Math.round((info.activeRate || 0) * 100);

  return (
    <div className="text-[11px] text-[var(--color-muted)]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{label}</span>
        <span>· {info.totalReviewers ?? 0} reviewer(s)</span>
        <span>· Quorum ≈ {quorumCountApprox} ({pctLabel}%)</span>
        <span>· Active {activePct}% in last {info.windowDays ?? 14}d</span>
        <span>· τ = {Math.round((info.tau || 0) * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden max-w-sm">
        <div
          className="h-1.5"
          style={{ width: `${activePct}%`, background: "var(--color-accent)" }}
          aria-hidden
        />
      </div>
    </div>
  );
}

function ModuleQueue({
  title,
  rows,
  onApprove,
  onReject,
  quorumNode,
  emptyText,
  getPreviewPath
}) {
  return (
    <Section title={title}>
      <div className="mb-2">{quorumNode}</div>

      {rows.length ? (
        <div className="space-y-3">
          {rows.map((q) => {
            const previewPath =
              typeof getPreviewPath === "function" ? getPreviewPath(q) : null;

            // Live vote tallies (counts only; no identities shown)
            let approveCount = 0, rejectCount = 0;
            try {
              const vb = getVotesBox(q.id);
              approveCount = (vb?.approvals || []).length;
              rejectCount = (vb?.rejections || []).length;
            } catch {}

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
                  <div className="text-xs text-[var(--color-muted)] mt-1">
                    {q.address}
                  </div>
                ) : null}

                {q.description ? <p className="text-sm mt-2">{q.description}</p> : null}

                <div className="mt-2 text-[11px] text-[var(--color-muted)] flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full ring-1 ring-[var(--color-border)]">
                    👍 Approvals: <b>{approveCount}</b>
                  </span>
                  <span className="px-2 py-0.5 rounded-full ring-1 ring-[var(--color-border)]">
                    👎 Rejections: <b>{rejectCount}</b>
                  </span>
                </div>

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

  // Queues
  const evRows   = useMemo(() => listPendingEvents(city),   [tick, city]);
  const mpRows   = useMemo(() => listPendingListings(city), [tick, city]);
  const jobRows  = useMemo(() => listPendingJobs(city),     [tick, city]);
  const discRows = useMemo(() => listPendingDiscover(city), [tick, city]);
  const rentRows = useMemo(() => listPendingRentals(city),  [tick, city]);

  // Transparency
  const evInfo   = useMemo(() => quorumInfo(city, "events"),       [city, tick]);
  const mpInfo   = useMemo(() => quorumInfo(city, "marketplace"),  [city, tick]);
  const jobInfo  = useMemo(() => quorumInfo(city, "jobs"),         [city, tick]);
  const discInfo = useMemo(() => quorumInfo(city, "discover"),     [city, tick]);
  const rentInfo = useMemo(() => quorumInfo(city, "rentals"),      [city, tick]);

  function needMember() {
    return (
      <div className="text-sm">
        You need to be a member to access the review queue{" "}
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
            <div className="text-sm text-[var(--color-muted)]">
              City: <b>{city}</b>
            </div>
            <div className="mt-2 text-xs text-[var(--color-muted)]">
              Reputation & Verification weighted votes. Quorum adapts to active reviewer participation.
            </div>
          </Section>

          {/* Explainer card: How voting works */}
          <Section title="How Voting Works (DWQM)">
            <div className="text-xs text-[var(--color-muted)] space-y-2">
              <p><b>Weight (W)</b> = Verification bonus (V) + Reputation (R). V = Phone (1.0) + KYC (1.5) + Address (0.5, optional). R = Accuracy × 2.</p>
              <p><b>Dynamic Quorum</b>: We need at least <i>neededWeight</i> = totalPotentialWeight × p, where p rises with city activity (60–80%).</p>
              <p><b>Decision threshold τ</b>: Low (60%), Medium (66%), High (75%) depending on the module.</p>
              <p><b>Secret ballot</b>: You don’t see others’ votes until it’s finalized. Results & weights are shown after.</p>
              <p><b>Rewards</b>: Correct voters share the module’s reward pool proportionally to their W.</p>
            </div>
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
            </>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Tip</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              “Active %” looks at unique reviewers who voted in the last {evInfo?.windowDays ?? 14} days.
              Quorum target rises with participation (60–80%). τ depends on the module’s stake tier.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
