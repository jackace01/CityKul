// src/pages/Chat.jsx
import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import Section from "../components/Section";
import { getUser } from "../lib/auth";
import { getOrCreateThreadId, listMessages as listDm, sendMessage as sendDm } from "../lib/api/chat";

function contextKey(id) {
  return `citykul:chat:${id}`;
}
function loadThread(id) {
  try {
    return JSON.parse(localStorage.getItem(contextKey(id)) || "[]");
  } catch {
    return [];
  }
}
function saveThread(id, msgs) {
  localStorage.setItem(contextKey(id), JSON.stringify(msgs));
}

export default function Chat() {
  const me = getUser();
  const meId = me?.email || "guest@demo";

  const params = new URLSearchParams(location.search);
  const mode = params.get("t") || "thread"; // "thread" (context) or "dm"
  const contextId = params.get("id") || "general";
  const contextTitle = params.get("title") || "Chat";

  const toUserId = params.get("to") || "";
  const toName = params.get("toName") || "User";

  // state
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [threadId, setThreadId] = useState("");

  // init
  useEffect(() => {
    if (mode === "dm" && toUserId) {
      const id = getOrCreateThreadId(meId, toUserId);
      setThreadId(id);
      setMsgs(listDm(id));
    } else {
      setThreadId(contextId);
      setMsgs(loadThread(contextId));
    }
  }, [mode, toUserId, contextId, meId]);

  function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;

    if (mode === "dm" && toUserId) {
      sendDm(threadId, {
        from: meId,
        fromName: me?.name || "Me",
        text: t
      });
      setMsgs(listDm(threadId));
    } else {
      const m = {
        id: `m-${Date.now()}`,
        ts: Date.now(),
        from: me?.name || "You",
        body: t
      };
      const next = [m, ...(msgs || [])];
      setMsgs(next);
      saveThread(contextId, next);
    }
    setText("");
  }

  const title = useMemo(() => {
    if (mode === "dm") return `Chat with ${toName}`;
    return contextTitle;
  }, [mode, toName, contextTitle]);

  return (
    <Layout>
      <Section title={title}>
        <form onSubmit={send} className="mb-3">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a message…"
            className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white"
          />
          <div className="text-right mt-2">
            <button className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">Send</button>
          </div>
        </form>

        <div className="space-y-3">
          {msgs.map((m) => {
            // unify item shape for DM/context
            const fromName = m.fromName || m.from || "User";
            const body = m.body || m.text || "";
            const ts = m.ts || Date.now();
            return (
              <div key={m.id} className="rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{fromName}</div>
                  <div className="text-xs text-[var(--color-muted)]">{new Date(ts).toLocaleString()}</div>
                </div>
                <div className="text-sm whitespace-pre-wrap mt-1">{body}</div>
              </div>
            );
          })}
          {!msgs.length && (
            <div className="text-sm text-[var(--color-muted)]">No messages yet. Start the conversation!</div>
          )}
        </div>
      </Section>
    </Layout>
  );
}
