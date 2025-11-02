// src/pages/SubmitGig.jsx
import React, { useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getUser, isMember } from "../lib/auth";
import { getSelectedCity } from "../lib/cityState";
import { createGigJob, GIG_CATEGORIES } from "../lib/api/jobs";

export default function SubmitGig() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const u = getUser();
  const member = isMember();
  const city = getSelectedCity() || u?.city || "Indore";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(GIG_CATEGORIES[0]);
  const [value, setValue] = useState(500);
  const [locality, setLocality] = useState("");
  const [timeWindow, setTimeWindow] = useState("");
  const [proof, setProof] = useState("photo");
  const [desc, setDesc] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!member) {
      alert("Subscribers only. Please upgrade your membership.");
      return;
    }
    const row = createGigJob(city, {
      title,
      client: u?.name || u?.email || "Client",
      category,
      value: Number(value || 0),
      locality,
      timeWindow,
      proof,
      description: desc,
      verified: false,
      tags: ["Gig"],
    }, u?.email || u?.name || "guest@demo");

    alert("Gig created (mock). Fee ₹5 & escrow freeze will be handled when backend wallet is connected.");
    nav("/jobs");
  }

  return (
    <Layout>
      <Section title="Create Gig Job">
        <form onSubmit={submit} className="max-w-2xl grid gap-3">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <div className="mb-1">Title</div>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900"
                />
              </label>

              <label className="text-sm">
                <div className="mb-1">Category</div>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900"
                >
                  {GIG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label className="text-sm">
                <div className="mb-1">Gig Value (₹)</div>
                <input
                  type="number"
                  min={1}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  required
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900"
                />
              </label>

              <label className="text-sm">
                <div className="mb-1">Locality / Area</div>
                <input
                  value={locality}
                  onChange={e => setLocality(e.target.value)}
                  placeholder="e.g., Sector 12"
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900"
                />
              </label>

              <label className="text-sm">
                <div className="mb-1">Time Window</div>
                <input
                  value={timeWindow}
                  onChange={e => setTimeWindow(e.target.value)}
                  placeholder="e.g., Today 4–7 PM"
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900"
                />
              </label>

              <label className="text-sm">
                <div className="mb-1">Proof Requirement</div>
                <select
                  value={proof}
                  onChange={e => setProof(e.target.value)}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900"
                >
                  <option value="photo">Photo upload</option>
                  <option value="file">File/Doc upload</option>
                  <option value="none">None</option>
                </select>
              </label>
            </div>

            <label className="text-sm block mt-3">
              <div className="mb-1">Description</div>
              <textarea
                rows={4}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900"
                placeholder="Describe the task clearly, meeting point, items to carry, safety notes…"
              />
            </label>
          </Card>

          <div className="text-xs text-[var(--color-muted)]">
            Posting a gig: <b>Fee ₹5</b> (non-refundable) and the <b>Gig Value is frozen in escrow</b>. Worker blocks <b>1.5× value</b> on accept. Completion, disputes, and payouts follow platform rules.
          </div>

          <div className="text-right">
            <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Create Gig</button>
          </div>
        </form>
      </Section>
    </Layout>
  );
}
