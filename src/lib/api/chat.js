// Local chat storage: threads + messages (CityKul keys with legacy migration)
import { loadJSON, saveJSON } from "../storage";

const KEY_THREADS = "citykul:chat:threads"; // { "<threadId>": { id, users: [a,b] } }
const KEY_MSGS    = "citykul:chat:msgs";    // { "<threadId>": [ {id, ts, from, fromName, text} ] }

function threadIdFor(a, b) {
  return [a, b].sort().join("::");
}

export function getOrCreateThreadId(a, b) {
  const id = threadIdFor(a, b);
  const threads = loadJSON(KEY_THREADS, {});
  if (!threads[id]) {
    threads[id] = { id, users: [a, b] };
    saveJSON(KEY_THREADS, threads);
  }
  return id;
}

export function listMessages(threadId) {
  const all = loadJSON(KEY_MSGS, {});
  return all[threadId] || [];
}

export function sendMessage(threadId, { from, fromName, text }) {
  const all = loadJSON(KEY_MSGS, {});
  const arr = all[threadId] || [];
  arr.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    from,
    fromName,
    text,
  });
  all[threadId] = arr;
  saveJSON(KEY_MSGS, all);
}

export function listUserThreads(userId) {
  const threads = loadJSON(KEY_THREADS, {});
  return Object.values(threads).filter((t) => t.users.includes(userId));
}
