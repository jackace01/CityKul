import React, { useEffect, useRef, useState } from "react";
import { getUser } from "../lib/auth";
import { getOrCreateThreadId, listMessages, sendMessage } from "../lib/api/chat";

export default function ChatDialog({ toUserId, toName, onClose }) {
  const me = getUser();
  const [threadId, setThreadId] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    const id = getOrCreateThreadId(me?.email || "guest@demo", toUserId);
    setThreadId(id);
    setMsgs(listMessages(id));
  }, [toUserId]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  function onSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(threadId, {
      from: me?.email || "guest@demo",
      fromName: me?.name || "Me",
      text,
    });
    setMsgs(listMessages(threadId));
    setText("");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-3">
      <div className="w-full max-w-md rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] overflow-hidden">
        <div className="px-3 py-2 flex items-center justify-between border-b border-[var(--color-border)]">
          <div className="font-semibold">Chat with {toName}</div>
          <button className="text-sm px-2 py-1 rounded ring-1 ring-[var(--color-border)]" onClick={onClose}>
            ✕
          </button>
        </div>
        <div ref={boxRef} className="h-72 overflow-auto p-3 space-y-2">
          {msgs.map((m) => (
            <div key={m.id} className={`max-w-[80%] ${m.from === (me?.email || "guest@demo") ? "ml-auto" : ""}`}>
              <div className="text-[10px] text-[var(--color-muted)]">{m.fromName}</div>
              <div className="px-3 py-2 rounded-xl bg-[var(--color-bg)] ring-1 ring-[var(--color-border)]">
                {m.text}
              </div>
            </div>
          ))}
          {!msgs.length && <div className="text-xs text-[var(--color-muted)]">No messages yet. Say hi!</div>}
        </div>
        <form onSubmit={onSend} className="p-3 border-t border-[var(--color-border)] flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message…"
            className="flex-1 rounded px-3 py-2 bg-white dark:bg-gray-900 border border-[var(--color-border)] text-black dark:text-white"
          />
          <button className="px-3 py-2 rounded bg-[var(--color-accent)] text-white">Send</button>
        </form>
      </div>
    </div>
  );
}
