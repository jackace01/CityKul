// LocalStorage-backed Posts API (CityKul namespace + legacy migration)
import { loadJSON, saveJSON } from "../storage";

// Single storage key
const KEY = "citykul:posts";

/*
  Post shape:
  {
    id, title, text, authorName, authorId, ownerId,
    city, locality,
    media: [{url,type}], likes: number, likedByMe: bool, savedByMe: bool,
    approved: boolean,
    createdAt: number,
    comments: [{ id, authorName, text, ts }],
    tags?: string[]
  }
*/

function load() {
  const arr = loadJSON(KEY, []);
  return Array.isArray(arr)
    ? arr.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))
    : [];
}

function save(arr) {
  saveJSON(KEY, arr || []);
}

export function seedIfEmpty() {
  const current = load();
  if (current.length) return;
  const demo = [
    {
      id: crypto.randomUUID(),
      authorName: "@anita",
      authorId: "anita",
      ownerId: "anita@demo",
      city: "Indore",
      locality: "Rajwada",
      text: "New park opening photos 🌳🎉",
      media: [],
      likes: 12,
      likedByMe: false,
      savedByMe: false,
      approved: true,
      createdAt: Date.now() - 60 * 60 * 1000,
      comments: [
        {
          id: crypto.randomUUID(),
          authorName: "@arif",
          text: "Looks great!",
          ts: Date.now() - 40 * 60 * 1000,
        },
      ],
      tags: ["Parks","City"]
    },
    {
      id: crypto.randomUUID(),
      authorName: "@civic",
      authorId: "civic",
      ownerId: "civic@demo",
      city: "Indore",
      locality: "Vijay Nagar",
      text: "Bus timings updated for Route 11 🚌",
      media: [],
      likes: 7,
      likedByMe: false,
      savedByMe: false,
      approved: true,
      createdAt: Date.now() - 2 * 60 * 60 * 1000,
      comments: [],
      tags: ["Transport"]
    },
  ];
  save(demo);
}

export function addPost(input) {
  const list = load();
  const post = {
    id: input?.id || crypto.randomUUID(),
    title: input?.title || "",
    text: input?.text || "",
    authorName: input?.authorName || input?.author || "Anonymous",
    authorId: input?.authorId || "",
    ownerId: input?.ownerId || "",
    city: input?.city || "",
    locality: input?.locality || "",
    media: input?.media || [],
    likes: typeof input?.likes === "number" ? input.likes : 0,
    likedByMe: !!input?.likedByMe,
    savedByMe: !!input?.savedByMe,
    approved: typeof input?.approved === "boolean" ? input.approved : false,
    createdAt: input?.createdAt || Date.now(),
    comments: Array.isArray(input?.comments) ? input.comments : [],
    tags: Array.isArray(input?.tags) ? input.tags : []
  };
  list.unshift(post);
  save(list);
  return post;
}
export const createPost = addPost;

export function getPostById(id) { return load().find((p) => p.id === id); }

export function listPosts(params = {}) {
  const { city, locality, onlyApproved = false, tag, dateStart, dateEnd } = params;
  let arr = load();

  if (onlyApproved) arr = arr.filter((p) => !!p.approved);

  if (city || locality) {
    arr = arr.filter((p) => {
      const okCity = city ? (p.city || "").toLowerCase() === city.toLowerCase() : true;
      const okLoc = locality ? (p.locality || "").toLowerCase() === locality.toLowerCase() : true;
      return okCity && okLoc;
    });
  }

  if (tag) {
    arr = arr.filter((p) => (p.tags || []).map(t=>t.toLowerCase()).includes(String(tag).toLowerCase()));
  }

  if (dateStart || dateEnd) {
    const s = dateStart ? new Date(dateStart).getTime() : -Infinity;
    const e = dateEnd ? new Date(dateEnd).getTime() + 24*60*60*1000 - 1 : Infinity;
    arr = arr.filter(p => (p.createdAt || 0) >= s && (p.createdAt || 0) <= e);
  }

  return arr;
}

export function approvePost(id) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return;
  list[idx].approved = true;
  save(list);
  return list[idx];
}

export function toggleLike(id) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const target = list[idx];
  target.likedByMe = !target.likedByMe;
  target.likes = Math.max(0, (target.likes || 0) + (target.likedByMe ? 1 : -1));
  save(list);
  return target;
}

export function addComment(id, authorName, text) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const c = {
    id: crypto.randomUUID(),
    authorName: authorName || "User",
    text: text || "",
    ts: Date.now(),
  };
  list[idx].comments = [c, ...(list[idx].comments || [])];
  save(list);
  return list[idx];
}

export function toggleSave(id) {
  const list = load();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  list[idx].savedByMe = !list[idx].savedByMe;
  save(list);
  return list[idx];
}
