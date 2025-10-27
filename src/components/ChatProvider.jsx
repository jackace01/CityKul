// src/components/ChatProvider.jsx
import React, { createContext, useContext, useState, useCallback, useRef } from "react";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef(null);

  const openChat = useCallback((target) => {
    setChatTarget(target);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setChatTarget(null);
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    (text) => {
      const content = (text ?? inputRef.current?.value ?? "").trim();
      if (!content) return;
      const msg = {
        id: crypto.randomUUID(),
        from: "me",
        to: chatTarget?.to || chatTarget?.toName || "Unknown",
        text: content,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
      if (inputRef.current) inputRef.current.value = "";
    },
    [chatTarget]
  );

  return (
    <ChatContext.Provider value={{ isOpen, chatTarget, openChat, closeChat, sendMessage, messages }}>
      {children}

      {isOpen && (
        <div className="fixed bottom-4 right-4 w-80 bg-[var(--color-surface)] rounded-lg shadow-lg border border-[var(--color-border)] flex flex-col z-50">
          <div className="p-2 flex justify-between items-center border-b border-[var(--color-border)]">
            <div className="text-sm font-semibold">💬 Chat with {chatTarget?.toName || chatTarget?.to || "User"}</div>
            <button onClick={closeChat} className="text-xs px-2 py-1 rounded hover:bg-[var(--color-bg)]">✕</button>
          </div>

          <div className="flex-1 overflow-auto p-2 space-y-1 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2 rounded-lg max-w-[80%] ${
                  m.from === "me" ? "ml-auto bg-[var(--color-accent)] text-white" : "bg-[var(--color-bg)]"
                }`}
              >
                {m.text}
              </div>
            ))}
            {!messages.length && (
              <div className="text-[var(--color-muted)] text-xs">Say hello 👋</div>
            )}
          </div>

          <div className="p-2 border-t border-[var(--color-border)] flex gap-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message…"
              className="flex-1 px-2 py-1 rounded border border-[var(--color-border)] text-sm bg-white dark:bg-gray-900 text-black dark:text-white"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage(e.currentTarget.value);
              }}
            />
            <button
              onClick={() => sendMessage()}
              className="px-3 py-1 bg-[var(--color-accent)] text-white rounded text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}
