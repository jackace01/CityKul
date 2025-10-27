import { loadJSON, saveJSON } from "../storage";

const KEY = "citykul:notifications";

function load() { return loadJSON(KEY, []); }
function save(arr) { saveJSON(KEY, arr); }

/** add a notification */
export function addNotification({ toUserId, title, body, link = "" }) {
  const list = load();
  const item = {
    id: `n-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    toUserId,
    title,
    body,
    link,
    read: false,
    ts: Date.now(),
  };
  list.unshift(item);
  save(list);
  return item;
}

/** get notifications for a user id (email recommended) */
export function listNotifications(toUserId) {
  return load().filter(n => n.toUserId === toUserId).sort((a,b)=>b.ts-a.ts);
}

export function markRead(id) {
  const list = load();
  const i = list.findIndex(n => n.id === id);
  if (i >= 0) { list[i].read = true; save(list); }
  return list[i] || null;
}

/** unread counter */
export function unreadCount(toUserId) {
  return listNotifications(toUserId).filter(n => !n.read).length;
}

/** mark all as read */
export function markAllRead(toUserId) {
  const list = load();
  let changed = false;
  for (const n of list) {
    if (n.toUserId === toUserId && !n.read) {
      n.read = true;
      changed = true;
    }
  }
  if (changed) save(list);
  return true;
}
