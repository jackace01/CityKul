import { loadJSON, saveJSON } from "../storage";

const KEY = "citykul:notices";
/*
  Notice: { id, text, by, date, createdAt }
*/
export function listNotices() {
  const arr = loadJSON(KEY, []);
  return arr.sort((a,b) => b.createdAt - a.createdAt);
}

export function submitNotice({ text, by }) {
  const list = listNotices();
  const today = new Date();
  const item = {
    id: crypto.randomUUID(),
    text: text?.trim() || "",
    by: by?.trim() || "Official",
    date: today.toLocaleDateString(),
    createdAt: Date.now(),
  };
  list.unshift(item);
  saveJSON(KEY, list);
  return item;
}
