// src/components/ChatButton.jsx
// Supports context threads and direct messages (DM)
// DM usage: contextType="dm", toUserId, toName
// Context usage (existing): contextType="thread", contextId, contextTitle, ownerId, ownerName

import { Link } from "react-router-dom";

export default function ChatButton({
  contextType = "thread",
  contextId = "",
  contextTitle = "",
  ownerId = "",
  ownerName = "",
  toUserId = "",
  toName = ""
}) {
  const params =
    contextType === "dm"
      ? new URLSearchParams({ t: "dm", to: toUserId, toName })
      : new URLSearchParams({
          t: contextType,
          id: contextId,
          title: contextTitle,
          ownerId,
          ownerName
        });

  return (
    <Link
      to={`/chat?${params.toString()}`}
      className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]"
      title="Open chat"
    >
      💬 Chat
    </Link>
  );
}
