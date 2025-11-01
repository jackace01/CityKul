// src/pages/AdminNotices.jsx
import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser } from "../lib/auth";
import { listModerationLog, clearModerationLog } from "../lib/review.js";

const MODULES = [
  { id: "all", label: "All modules" },
  { id: "events", label: "Events" },
  { id: "marketplace", label: "Marketplace" },
  { id: "jobs", label: "Jobs" },
  { id: "rentals", label: "Rentals" },
  { id: "discover", label: "Discover" },
];

export default function AdminNotices() {
  const u = getUser();
  const defaultCity = u?.city || localStorage.getItem("citykul:city") || "";

  const [tab, setTab] = useState("publish");

  // Publish state (your existing mock)
  const [text, setText] = useState("");
  const [by, setBy] = useState("");
  const [date, setDate] = useState("");

  function submit(e) {
    e.preventDefault();
    alert("Admin notice submitted (mock):\n" + JSON.stringify({ text, by, date }, null, 2));
  }

  // Moderation Log state
  const [city, setCity] = useState(defaultCity);
  const [moduleId, setModuleId] = useState("all");
  const [sinceDays, setSinceDays] = useState(30);
  const [tick, setTick] = useState(0);

  const rows = useMemo(() => {
    const toTs = Date.now();
    const fromTs = toTs - Math.max(1, Number(sinceDays || 30)) * 24 * 60 * 60 * 1000;
    return listModerationLog({
      city: city?.trim() ? city.trim() : undefined,
      module: moduleId,
      fromTs,
      toTs,
      limit: 500,
    });
  }, [city, moduleId, sinceDays, tick]);

  function doClear() {
    if (confirm("Clear ALL moderation log entries? This cannot be undone.")) {
      clearModerationLog();
      setTick((t) => t + 1);
    }
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-6">
          <Section title="Government Notice Board – Admin">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTab("publish")}
                className={`px-3 py-1 rounded ${tab === "publish" ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
              >
                Publish Notice
              </button>
              <button
                onClick={() => setTab("modlog")}
                className={`px-3 py-1 rounded ${tab === "modlog" ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
              >
                Moderation Log
              </button>
            </div>

            {tab === "publish" ? (
              <form onSubmit={submit} className="max-w-lg space-y-3">
                <div>
                  <label className="text-sm block mb-1">Notice text</label>
                  <textarea
                    rows={3}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm block mb-1">Department / By</label>
                    <input
                      value={by}
                      onChange={(e) => setBy(e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm block mb-1">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Publish</button>
                </div>
              </form>
            ) : null}

            {tab === "modlog" ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div>
                    <label className="block text-sm mb-1">City</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Indore"
                      className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Module</label>
                    <select
                      value={moduleId}
                      onChange={(e) => setModuleId(e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                    >
                      {MODULES.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Since (days)</label>
                    <input
                      type="number"
                      min={1}
                      value={sinceDays}
                      onChange={(e) => setSinceDays(e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-900 text-black dark:text-white"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => setTick(t => t + 1)}
                      className="px-3 py-2 rounded ring-1 ring-[var(--color-border)]"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={doClear}
                      className="px-3 py-2 rounded bg-red-600 text-white"
                    >
                      Clear Log
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-[var(--color-muted)] bg-[var(--color-elev)]">
                      <tr>
                        <th className="text-left px-3 py-2">Time</th>
                        <th className="text-left px-3 py-2">Module</th>
                        <th className="text-left px-3 py-2">City</th>
                        <th className="text-left px-3 py-2">ID</th>
                        <th className="text-left px-3 py-2">Outcome</th>
                        <th className="text-left px-3 py-2">Quorum</th>
                        <th className="text-left px-3 py-2">Votes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-[var(--color-muted)]">
                            No moderation decisions found for the selected filters.
                          </td>
                        </tr>
                      ) : (
                        rows.map((r) => (
                          <tr key={`${r.id}-${r.ts}`} className="border-t border-[var(--color-border)]">
                            <td className="px-3 py-2">{new Date(r.ts || 0).toLocaleString()}</td>
                            <td className="px-3 py-2">{r.module}</td>
                            <td className="px-3 py-2">{r.city}</td>
                            <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                r.status === "approved" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {r?.quorum
                                ? `need ${r.quorum.neededWeight} / total ${r.quorum.totalWeight} @ ${Math.round((r.quorum.targetPercent || 0) * 100)}%`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {r?.votes
                                ? `${r.votes.approvals}✓/${r.votes.rejections}✗ · wt ${r.votes.approvalWeight}/${r.votes.rejectionWeight}`
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </Section>
        </div>

        <div className="hidden lg:block">
          <div className="rounded-2xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
            <div className="text-sm font-semibold">Tip</div>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              The Moderation Log reflects final decisions when a weighted quorum is reached. Use filters to audit by city or module.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
