// src/pages/SubmitContestEntry.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { getUser, isMember } from "../lib/auth";
import { submitContestEntry } from "../lib/api/contests.js";

export default function SubmitContestEntry() {
  const u = getUser();
  const member = isMember();
  const navigate = useNavigate();

  const [type, setType] = useState("photo");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [category, setCategory] = useState("General");

  if (!member) {
    return (
      <Layout>
        <Section title="Submit Contest Entry">
          <div className="text-sm text-[var(--color-muted)]">You need to be a member to submit entries.</div>
        </Section>
      </Layout>
    );
  }

  function submitForm(e) {
    e.preventDefault();
    if (!title.trim()) return alert("Title is required");
    if (type === "photo" && !photoUrl.trim()) return alert("Photo URL is required for Photo entries");
    if (type === "description" && !text.trim()) return alert("Description text is required");

    const rec = submitContestEntry({
      type,
      title,
      text: type === "description" ? text : "",
      photoUrl: type === "photo" ? photoUrl : "",
      category,
      city: u?.city,
      ownerId: u?.email || u?.name || "guest@demo",
    });
    alert("Submitted for review. Entry ID: " + rec.id);
    navigate("/contests");
  }

  return (
    <Layout>
      <Section title="Submit Contest Entry">
        <Card>
          <form onSubmit={submitForm} className="grid gap-3 max-w-xl">
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              >
                <option value="photo">Photo</option>
                <option value="description">Description</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>

            {type === "photo" ? (
              <div>
                <label className="block text-sm mb-1">Photo URL</label>
                <input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm mb-1">Description Text</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm mb-1">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="General"
                className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
              />
            </div>

            <div className="pt-2">
              <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Submit for Review</button>
            </div>
          </form>
        </Card>
      </Section>
    </Layout>
  );
}
