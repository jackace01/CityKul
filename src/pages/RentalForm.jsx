// src/pages/RentalForm.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, isMember } from "../lib/auth";
import {
  submitRental,
  RENTAL_CATEGORIES,
  setAvailability
} from "../lib/api/rentals";

export default function RentalForm() {
  const user = getUser();
  const member = isMember();
  const navigate = useNavigate();

  // Basic listing fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(RENTAL_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [pricePer, setPricePer] = useState("day"); // day/week/month
  const [deposit, setDeposit] = useState("");
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [media, setMedia] = useState(""); // comma-separated URLs

  // Availability editor (simple ranges)
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [avail, setAvail] = useState([]); // [{start, end}]

  function addRange() {
    if (!start || !end) {
      alert("Select both start and end dates.");
      return;
    }
    if (new Date(start) > new Date(end)) {
      alert("Start should be before End.");
      return;
    }
    setAvail((a) => [...a, { start, end }]);
    setStart("");
    setEnd("");
  }
  function removeRange(idx) {
    setAvail((a) => a.filter((_, i) => i !== idx));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!member) {
      alert("Become a member to submit rentals.");
      return;
    }
    const city = user?.city || localStorage.getItem("citykul:city") || "Indore";
    const payload = {
      city,
      category,
      title: title.trim(),
      description: description.trim(),
      price: Number(price || 0),
      pricePer,
      deposit: Number(deposit || 0),
      address: address.trim(),
      locality: locality.trim(),
      ownerId: user?.email || user?.name || "user",
      media: media
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      availability: avail // submit availability with the listing
    };

    try {
      const rec = submitRental(payload); // goes to decentralised review queue
      // Also write availability to overlay immediately (so it’s present by listing id)
      if (rec?.id && avail.length) {
        setAvailability(rec.id, avail);
      }
      alert("Submitted! Your rental will appear in the Review queue.");
      navigate("/review");
    } catch (err) {
      console.error(err);
      alert("Could not submit. Please check your inputs.");
    }
  }

  return (
    <Layout>
      <Section title="Post a Local Rental">
        {!member ? (
          <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-4">
            <div className="text-sm">Become a member to post rentals.</div>
            <Link to="/membership" className="mt-2 inline-block px-3 py-1 rounded ring-1 ring-[var(--color-border)]">
              Become a member
            </Link>
          </div>
        ) : (
          <Card>
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Basic details */}
              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-sm">
                  <div className="mb-1">Title</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                    placeholder="e.g., 1BHK Flat near Civil Lines"
                    required
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-1">Category</div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  >
                    {RENTAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <div className="mb-1">Price</div>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                    placeholder="e.g., 800"
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-1">Price Per</div>
                  <select
                    value={pricePer}
                    onChange={(e) => setPricePer(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                </label>

                <label className="text-sm">
                  <div className="mb-1">Security Deposit</div>
                  <input
                    type="number"
                    min="0"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                    placeholder="e.g., 1000"
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-1">Locality</div>
                  <input
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                    placeholder="e.g., Civil Lines"
                  />
                </label>
              </div>

              <label className="text-sm block">
                <div className="mb-1">Address</div>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  placeholder="House/Street, Landmark"
                />
              </label>

              <label className="text-sm block">
                <div className="mb-1">Description</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)] h-28"
                  placeholder="Key features, usage terms, deposit rules…"
                />
              </label>

              <label className="text-sm block">
                <div className="mb-1">Photos (comma-separated URLs)</div>
                <input
                  value={media}
                  onChange={(e) => setMedia(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  placeholder="https://... , https://..."
                />
              </label>

              {/* Availability editor */}
              <div>
                <div className="font-semibold mb-2">Availability</div>
                <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <label className="text-sm">
                    <div className="mb-1">Start</div>
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                    />
                  </label>
                  <label className="text-sm">
                    <div className="mb-1">End</div>
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                    />
                  </label>
                  <button type="button" onClick={addRange} className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">
                    + Add
                  </button>
                </div>

                {avail.length ? (
                  <div className="mt-3 space-y-2">
                    {avail.map((r, idx) => (
                      <div key={`${r.start}-${r.end}-${idx}`} className="flex items-center justify-between rounded ring-1 ring-[var(--color-border)] px-3 py-2">
                        <div className="text-sm">{r.start} → {r.end}</div>
                        <button type="button" onClick={() => removeRange(idx)} className="text-sm underline">
                          remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-[var(--color-muted)]">Add one or more available date ranges.</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Submit for review</button>
                <Link to="/rentals" className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]">Cancel</Link>
              </div>
            </form>
          </Card>
        )}
      </Section>
    </Layout>
  );
}
