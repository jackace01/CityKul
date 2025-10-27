import { useNavigate } from "react-router-dom";

export default function ChatDock() {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav("/chat")}
      title="Open Chat"
      className="fixed bottom-5 right-5 z-40 h-12 min-w-12 px-4 rounded-full shadow-lg
                 bg-[var(--color-accent)] text-white flex items-center justify-center gap-2"
    >
      <span>💬</span>
      <span className="hidden sm:inline text-sm font-semibold">Chat</span>
    </button>
  );
}
