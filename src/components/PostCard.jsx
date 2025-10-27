import { useState } from "react";
import ChatButton from "./ChatButton";

export default function PostCard({ post, onChange }) {
  const [busy, setBusy] = useState(false);

  function toggle(key) {
    if (busy) return;
    setBusy(true);
    const next = {
      ...post,
      [key]: !post[key],
      likes: key === "liked" ? (post.liked ? Math.max(0, (post.likes || 0) - 1) : (post.likes || 0) + 1) : (post.likes || 0),
    };
    onChange(next);
    setBusy(false);
  }

  function share() {
    const url = `${location.origin}/feed?post=${post.id}`;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url);
    alert("Post link copied!");
  }

  return (
    <div className="rounded-xl p-4 bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-muted)]">
            📍 {post.city}{post.locality ? ` - ${post.locality}` : ""}
          </div>
          <div className="text-sm font-semibold">{post.authorName}</div>
          <div className="text-xs text-[var(--color-muted)]">{new Date(post.createdAt).toLocaleString()}</div>
        </div>
        <div className="text-xs rounded-full px-2 py-1 bg-black/5 dark:bg-white/5">
          {post.category || "Update"}
        </div>
      </div>

      <p className="mt-2 text-sm whitespace-pre-wrap">{post.text}</p>

      {!!(post.media?.length) && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {post.media.slice(0,4).map((m,i)=>(
            <img key={i} src={m.url} alt="" className="rounded-lg ring-1 ring-[var(--color-border)] object-cover w-full h-28" />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => toggle("liked")}
          className={`px-3 py-1 rounded ${post.liked ? "bg-[var(--color-accent)] text-white" : "ring-1 ring-[var(--color-border)]"}`}
        >
          👍 {post.likes || 0}
        </button>
        <button
          onClick={() => toggle("saved")}
          className={`px-3 py-1 rounded ${post.saved ? "bg-emerald-600 text-white" : "ring-1 ring-[var(--color-border)]"}`}
        >
          ⭐ Save
        </button>
        <button onClick={share} className="px-3 py-1 rounded ring-1 ring-[var(--color-border)]">
          🔗 Share
        </button>
        <div className="ml-auto">
          <ChatButton
            contextType="post"
            contextId={post.id}
            contextTitle={`Post by ${post.authorName}`}
            ownerId={post.authorId || post.authorName}
            ownerName={post.authorName || "User"}
          />
        </div>
      </div>
    </div>
  );
}
