// src/components/Poll.jsx
import React, { useMemo, useState } from "react";
import { getUser } from "../lib/auth";
import { createPoll, votePoll } from "../lib/api/events";

export default function Poll({ eventId, polls = [], onChange }) {
  const u = getUser();
  const me = u?.email || "guest@demo";
  const [question, setQuestion] = useState("");
  const [opts, setOpts] = useState("Yes,No");

  const totalVotes = (p) => p.options.reduce((s,o)=> s + (o.votes?.length || 0), 0);

  function makePoll(e) {
    e.preventDefault();
    const arr = opts.split(",").map(s=>s.trim()).filter(Boolean);
    if (!question.trim() || arr.length < 2) return;
    createPoll(eventId, question.trim(), arr);
    setQuestion("");
    setOpts("Yes,No");
    onChange?.();
  }

  function choose(pollId, optionId) {
    votePoll(eventId, pollId, optionId, me);
    onChange?.();
  }

  const content = useMemo(() => {
    return (
      <div className="space-y-4">
        <form onSubmit={makePoll} className="rounded-xl ring-1 ring-[var(--color-border)] p-3 bg-[var(--color-surface)]">
          <div className="text-sm font-medium mb-2">Create a quick poll</div>
          <input
            value={question}
            onChange={(e)=>setQuestion(e.target.value)}
            placeholder="Question"
            className="w-full mb-2 rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white"
          />
          <input
            value={opts}
            onChange={(e)=>setOpts(e.target.value)}
            placeholder="Options (comma separated)"
            className="w-full mb-2 rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white"
          />
          <div className="text-right">
            <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Create</button>
          </div>
        </form>

        <div className="space-y-3">
          {polls.map(p => {
            const total = totalVotes(p) || 1;
            return (
              <div key={p.id} className="rounded-xl ring-1 ring-[var(--color-border)] p-3 bg-[var(--color-surface)]">
                <div className="text-sm font-semibold">{p.question}</div>
                <div className="mt-2 space-y-2">
                  {p.options.map(o=>{
                    const pct = Math.round(((o.votes?.length || 0) / total) * 100);
                    return (
                      <button
                        key={o.id}
                        onClick={()=>choose(p.id, o.id)}
                        className="w-full text-left"
                      >
                        <div className="text-sm">{o.text}</div>
                        <div className="h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden mt-1">
                          <div className="h-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[11px] text-[var(--color-muted)]">{pct}%</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!polls.length && <div className="text-sm text-[var(--color-muted)]">No polls yet.</div>}
        </div>
      </div>
    );
  }, [polls, question, opts]);

  return content;
}
