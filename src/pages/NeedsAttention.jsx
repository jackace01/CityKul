// src/pages/NeedsAttention.jsx
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { needsTags } from "../lib/data";
import { getUser } from "../lib/auth";
import { pickTags, getUserSelectedTags, getTopTags } from "../lib/api/needs";

export default function NeedsAttention() {
  const u = getUser();
  const uid = u?.email || "guest@demo";

  const [selected, setSelected] = useState([]);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [top, setTop] = useState([]);

  useEffect(() => {
    // Prefill with user's last picks
    setSelected(getUserSelectedTags(uid));
    setTop(getTopTags(5));
  }, [uid]);

  function toggleTag(tag) {
    setSaved(false);
    setSelected((s) => (s.includes(tag) ? s.filter((x) => x !== tag) : [...s, tag]));
  }

  function submitSelection() {
    if (!selected.length) {
      alert("Please select at least one tag about your city's issues.");
      return;
    }
    pickTags(uid, selected);
    setSaved(true);
    setTop(getTopTags(5)); // refresh live leaderboard
  }

  return (
    <Layout>
      <Section title="City Needs Attention">
        {/* Tag chooser */}
        <div className="mb-4 flex flex-wrap gap-2">
          {needsTags.map((t) => (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className={`px-3 py-1 rounded-full border transition ${
                selected.includes(t)
                  ? "bg-white text-black"
                  : "border-[var(--color-border)] hover:bg-[var(--color-surface)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={submitSelection}
            className="px-4 py-2 rounded bg-[var(--color-accent)] text-white"
          >
            Submit your picks
          </button>
          {saved && (
            <span className="text-sm text-[var(--color-muted)]">
              Saved! Your votes will influence what shows up in “Trending in your city”.
            </span>
          )}
        </div>

        {/* Problem report box (optional free-text) */}
        <Card>
          <h3 className="font-semibold mb-2">Report a problem (optional)</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Describe the issue (location, details)…"
            className="w-full rounded bg-white dark:bg-gray-900 border border-[var(--color-border)] px-3 py-2 text-black dark:text-white"
          />
          <button
            className="mt-3 px-3 py-2 rounded bg-[var(--color-accent)] text-white"
            onClick={() => {
              if (!text.trim()) return alert("Please add a few details first.");
              // In this mock, we only acknowledge the text report.
              alert("Thanks! Your report has been noted (mock).");
              setText("");
            }}
          >
            Submit report
          </button>
        </Card>

        {/* Leaderboard of top tags (helps users see momentum) */}
        <h3 className="text-lg font-semibold mt-6 mb-2">Most picked city issues</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {top.length ? (
            top.map((i) => (
              <Card key={i.tag}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{i.tag}</div>
                  <div className="text-xs text-[var(--color-muted)]">{i.count} picks</div>
                </div>
              </Card>
            ))
          ) : (
            <Card>No tags picked yet. Be the first to highlight an issue!</Card>
          )}
        </div>
      </Section>
    </Layout>
  );
}
