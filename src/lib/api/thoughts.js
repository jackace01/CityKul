// src/lib/api/thoughts.js
// "Today I'm thinking" wall for Trending — threaded micro-posts with tags

const KEY = "citykul:thoughts:v1"; // array of { id, ts, authorId, authorName, city, locality, text, tags[], likes, comments[] }
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr)
      ? arr.sort((a, b) => (b?.ts || 0) - (a?.ts || 0))
      : [];
  } catch {
    return [];
  }
}
function save(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr || []));
}

export function addThought({ authorId, authorName, city = "", locality = "", text = "", tags = [] }) {
  const list = load();
  const t = {
    id: `th-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    authorId: authorId || "guest@demo",
    authorName: authorName || "User",
    city,
    locality,
    text: String(text || "").trim(),
    tags: Array.from(new Set((tags || []).map((x) => String(x).trim()).filter(Boolean))),
    likes: 0,
    likedBy: [],
    comments: [], // { id, ts, authorId, authorName, text }
  };
  list.unshift(t);
  save(list);
  return t;
}

export function listThoughts({ city = "", locality = "", tag = "", limit = 100 } = {}) {
  let arr = load();
  if (city) arr = arr.filter((x) => (x.city || "").toLowerCase() === city.toLowerCase());
  if (locality) arr = arr.filter((x) => (x.locality || "").toLowerCase() === locality.toLowerCase());
  if (tag) arr = arr.filter((x) => (x.tags || []).some((t) => t.toLowerCase() === tag.toLowerCase()));
  return arr.slice(0, limit);
}

export function toggleLikeThought(id, userId = "guest@demo") {
  const list = load();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const liked = list[i].likedBy.includes(userId);
  if (liked) {
    list[i].likedBy = list[i].likedBy.filter((u) => u !== userId);
  } else {
    list[i].likedBy.push(userId);
  }
  list[i].likes = list[i].likedBy.length;
  save(list);
  return list[i];
}

export function commentThought(id, { authorId = "guest@demo", authorName = "User", text = "" }) {
  const list = load();
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const c = {
    id: `c-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    authorId,
    authorName,
    text: String(text || "").trim(),
  };
  list[i].comments.unshift(c);
  save(list);
  return c;
}
