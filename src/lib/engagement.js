// src/lib/engagement.js
import { loadJSON, saveJSON } from "./storage";

const K = (id) => `citykul:eng:${id}`;
// structure {likes, shares, comments, interests, buys}

export function getEngagement(id) {
  return loadJSON(K(id), { likes: 0, shares: 0, comments: 0, interests: 0, buys: 0 });
}
export function bump(id, field) {
  const v = getEngagement(id);
  v[field] = (v[field] || 0) + 1;
  saveJSON(K(id), v);
  return v;
}
export function score(id) {
  const s = getEngagement(id);
  // weights can be tuned
  return 3 * s.likes + 4 * s.shares + 2 * s.comments + 5 * s.interests + 6 * s.buys;
}
