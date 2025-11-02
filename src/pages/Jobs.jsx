// src/pages/Jobs.jsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { Link, useNavigate } from "react-router-dom";
import { isMember, getUser } from "../lib/auth";
import { getSelectedCity } from "../lib/cityState";

import {
  ensureSeed,
  listJobs,
  FORMAL_CATEGORIES,
  GIG_CATEGORIES,
  applyFormal,
  toggleSaveJob,
  reportJob,
} from "../lib/api/jobs";

// New: show stake preview
import { getReputation } from "../lib/reputation";
import { previewStake } from "../lib/stake";

function Chip({ children }) {
  return <span className="text-[11px] px-2 py-0.5 rounded-full ring-1 ring-[var(--color-border)]">{children}</span>;
}

function JobCard({ item, onApply, onSave, onReport }) {
  const metaLine =
    item.type === "formal"
      ? `${item.employer || "—"} · ${item.locality || "—"}`
      : `${item.client || "—"} · ${item.locality || "—"}`;

  const pay = item.type === "formal" ? (item.pay || "—") : `₹${Number(item.value || 0)}`;
  const tagList = item.tags || [];

  return (
    <Card className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">{item.title}</div>
          <div className="text-xs text-[var(--color-muted)]">{metaLine}</div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Chip>{item.type === "formal" ? (item.roleType || "Role") : "Gig"}</Chip>
            <Chip>{item.category || "General"}</Chip>
            <Chip>{pay}</Chip>
            {item.verified ? <Chip>Verified</Chip> : null}
          </div>
        </div>
        <div className="text-right text-xs text-[var(--color-muted)] whitespace-nowrap">
          {new Date(item.createdAt || 0).toLocaleDateString()}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.type === "formal" ? (
          <button onClick={() => onApply(item)} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Apply (Rep Stake)</button>
        ) : (
          <Link to={`/gigs/new?from=${encodeURIComponent(item.id)}`} className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
            I can do this
          </Link>
        )}
        <button onClick={() => onSave(item)} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Save</button>
        <button onClick={() => onReport(item)} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Report</button>
      </div>

      {!!tagList.length && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tagList.slice(0, 6).map((t, i) => <Chip key={i}>{t}</Chip>)}
        </div>
      )}
    </Card>
  );
}

export default function Jobs() {
  const member = isMember();
  const u = getUser();
  const userId = u?.email || u?.name || "guest@demo";
  const city = getSelectedCity() || u?.city || "Indore";
  const nav = useNavigate();

  // ----------------- Filters/search -----------------
  const [q, setQ] = useState("");
  const [type, setType] = useState("all"); // all|formal|gig
  const [category, setCategory] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [payMin, setPayMin] = useState("");
  const [payMax, setPayMax] = useState("");

  useEffect(() => { ensureSeed(city); }, [city]);

  const jobs = useMemo(() => listJobs({
    city,
    q,
    type,
    category,
    verifiedOnly,
    payMin: payMin ? Number(payMin) : 0,
    payMax: payMax ? Number(payMax) : Infinity,
  }), [city, q, type, category, verifiedOnly, payMin, payMax]);

  // ----------------- Actions -----------------
  function doApplyFormal(item) {
    try {
      const rep = getReputation(userId, city);
      const { stake, policy } = previewStake(userId, city, rep);
      const ok = window.confirm(
        `This formal job requires a reputation stake.\n\n` +
        `Your current Reputation: ${rep}\n` +
        `Stake to be locked now: ${stake} (≈ ${Math.round((policy.percentAtAccept||0.3)*100)}% of your reputation)\n\n` +
        `On success: stake released + ${Math.round((policy.bonusOnSuccess||0.1)*100)}% bonus\n` +
        `On default: up to ${Math.round((policy.burnOnDefault||1.0)*100)}% of stake burnt\n\n` +
        `Proceed to apply?`
      );
      if (!ok) return;

      applyFormal({ city, jobId: item.id, userId, cvUrl: u?.cvUrl || "" });
      alert("Applied. Your reputation stake has been locked for this job. Client fees go to the app wallet (non-refundable).");
    } catch (e) {
      alert("Could not apply: " + e.message);
    }
  }
  function doSave(item) {
    toggleSaveJob({ city, jobId: item.id, type: item.type, userId });
    alert("Saved.");
  }
  function doReport(item) {
    const reason = prompt("Report reason (fraud/spam/fake company/abuse):", "fraud");
    if (!reason) return;
    reportJob({ city, jobId: item.id, type: item.type, userId, reason });
    alert("Reported. This will go to the Review Center for quorum.");
  }

  // ----------------- Category Grid -----------------
  const CAT_TILES = [
    ...FORMAL_CATEGORIES.map(c => ({ type: "formal", label: c })),
    { type: "gig", label: "Gigs (Microtasks)" },
    ...GIG_CATEGORIES.map(c => ({ type: "gig", label: c })),
  ];

  const visibleCats = useMemo(() => {
    if (type === "all") return CAT_TILES;
    return CAT_TILES.filter(x => x.type === type);
  }, [type]);

  // ----------------- Post button -----------------
  function postJob() {
    if (!member) {
      if (confirm("Posting jobs is for subscribers. Go to Membership?")) {
        nav("/membership");
      }
      return;
    }
    const pick = window.prompt("Type 'formal' to create Formal Job, or 'gig' to create Gig Job:", "formal");
    if (!pick) return;
    if (pick.toLowerCase() === "formal") nav("/submit-job");
    else if (pick.toLowerCase() === "gig") nav("/gigs/new");
    else alert("Invalid choice. Type formal or gig.");
  }

  return (
    <Layout>
      {/* JOBS HEADER */}
      <Section title="Jobs">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Role, company, location…"
              className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
            />
          </div>

          {/* Filters toggle row */}
          <div className="flex gap-2">
            <select value={type} onChange={(e) => setType(e.target.value)} className="px-2 py-2 rounded border border-[var(--color-border)] bg-white dark:bg-gray-900">
              <option value="all">All</option>
              <option value="formal">Formal Jobs</option>
              <option value="gig">Gig Jobs</option>
            </select>

            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-2 py-2 rounded border border-[var(--color-border)] bg-white dark:bg-gray-900">
              <option value="">Category</option>
              {(type === "gig" ? GIG_CATEGORIES : FORMAL_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
              {type === "all" ? <option value="Gigs (Microtasks)">Gigs (Microtasks)</option> : null}
            </select>

            <label className="px-2 py-2 rounded border border-[var(--color-border)] bg-white dark:bg-gray-900 text-xs flex items-center gap-2">
              <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
              Verified only
            </label>

            <input
              type="number"
              min={0}
              placeholder="Min ₹"
              value={payMin}
              onChange={e => setPayMin(e.target.value)}
              className="w-24 px-2 py-2 rounded border border-[var(--color-border)] bg-white dark:bg-gray-900"
            />
            <input
              type="number"
              min={0}
              placeholder="Max ₹"
              value={payMax}
              onChange={e => setPayMax(e.target.value)}
              className="w-24 px-2 py-2 rounded border border-[var(--color-border)] bg-white dark:bg-gray-900"
            />
          </div>
        </div>
      </Section>

      {/* CATEGORY GRID */}
      <Section title="Browse by Category">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleCats.map((c, i) => (
            <button
              key={`${c.type}-${c.label}-${i}`}
              onClick={() => { setType(c.type); setCategory(c.label === "Gigs (Microtasks)" ? "" : c.label); }}
              className="text-left rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3 hover:shadow transition"
            >
              <div className="text-lg">{c.type === "gig" ? "⚡" : "💼"}</div>
              <div className="font-semibold mt-1">{c.label}</div>
              <div className="text-[11px] text-[var(--color-muted)]">{c.type === "gig" ? "Quick tasks near you" : "Open roles in your city"}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* JOB LISTINGS */}
      <Section title="Job Listings" rightText="Post a Job" rightHref="#" rightOnClick={(e) => { e.preventDefault(); postJob(); }}>
        {jobs.length === 0 ? (
          <div className="text-sm text-[var(--color-muted)]">No jobs match your filters. Try widening your search.</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {jobs.map(j => (
              <JobCard
                key={j.id}
                item={j}
                onApply={doApplyFormal}
                onSave={doSave}
                onReport={doReport}
              />
            ))}
          </div>
        )}
      </Section>

      {/* POST BUTTON (Subscriber only) */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <button
          onClick={postJob}
          className={`w-full sm:w-auto px-4 py-2 rounded ${isMember() ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
          title={isMember() ? "Create Formal or Gig Job" : "Subscribers only"}
        >
          + Post a Job
        </button>
        {!isMember() && (
          <div className="text-xs text-[var(--color-muted)] mt-1">
            Posting requires a subscription. <Link to="/membership" className="underline">Upgrade</Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
