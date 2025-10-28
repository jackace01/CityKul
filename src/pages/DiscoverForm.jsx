// src/pages/DiscoverForm.jsx
import { useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser, isMember } from "../lib/auth";
import { useNavigate } from "react-router-dom";
import {
  submitDiscover,
  DISCOVER_CATEGORIES,
  ensureDiscoverReviewer
} from "../lib/api/discover.js";

export default function DiscoverForm() {
  const nav = useNavigate();
  const user = getUser();
  const member = isMember();

  // Auto-register member as reviewer for their city (optional & harmless)
  if (user?.city && member) ensureDiscoverReviewer(user.city, user.email || user.name || "user");

  const [form, setForm] = useState({
    category: "Shops & Businesses",
    name: "",
    description: "",
    address: "",
    locality: user?.locality || "",
    city: user?.city || "",
    contact: "",
    website: "",
  });

  function update(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!member) {
      alert("Become a member to submit.");
      return;
    }
    if (!form.city || !form.name) {
      alert("Please enter at least City and Name.");
      return;
    }
    submitDiscover({
      ...form,
      ownerId: user?.email || user?.name || "",
      media: []
    });
    alert("Submitted for review! It will go live after approvals.");
    nav("/review");
  }

  return (
    <Layout>
      <Section title="Add New Place (Discover)">
        {!member ? (
          <div className="text-sm">You need to be a member to submit.</div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-3 max-w-2xl">
            <div>
              <div className="text-sm mb-1">Category</div>
              <div className="flex flex-wrap gap-2">
                {DISCOVER_CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => update("category", c)}
                    className={`px-3 py-1 rounded-full border ${form.category === c ? "bg-white text-black" : "border-[var(--color-border)]"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm mb-1">Name</div>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                placeholder="e.g., Sunrise Café"
                required
              />
            </div>

            <div>
              <div className="text-sm mb-1">Description</div>
              <textarea
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="w-full px-3 py-2 rounded border border-[var(--color-border)] h-28"
                placeholder="What’s new? Why should people visit?"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm mb-1">Address</div>
                <input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  placeholder="Street, area"
                />
              </div>
              <div>
                <div className="text-sm mb-1">Locality</div>
                <input
                  value={form.locality}
                  onChange={(e) => update("locality", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  placeholder="Neighbourhood"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm mb-1">City</div>
                <input
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <div className="text-sm mb-1">Contact (optional)</div>
                <input
                  value={form.contact}
                  onChange={(e) => update("contact", e.target.value)}
                  className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                  placeholder="Phone or email"
                />
              </div>
            </div>

            <div>
              <div className="text-sm mb-1">Website (optional)</div>
              <input
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className="w-full px-3 py-2 rounded border border-[var(--color-border)]"
                placeholder="https://"
              />
            </div>

            <div className="pt-2">
              <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Submit</button>
            </div>
          </form>
        )}
      </Section>
    </Layout>
  );
}
