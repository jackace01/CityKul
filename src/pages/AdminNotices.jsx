// src/pages/AdminNotices.jsx
import Layout from "../components/Layout";
import Section from "../components/Section";
import { useState } from "react";

export default function AdminNotices() {
  const [text, setText] = useState("");
  const [by, setBy] = useState("");
  const [date, setDate] = useState("");

  function submit(e) {
    e.preventDefault();
    alert("Admin notice submitted (mock):\n" + JSON.stringify({text, by, date}, null, 2));
  }

  return (
    <Layout>
      <Section title="Government Notice Board – Admin">
        <form onSubmit={submit} className="max-w-lg mx-auto space-y-3">
          <div>
            <label className="text-sm block mb-1">Notice text</label>
            <textarea rows={3} value={text} onChange={e=>setText(e.target.value)}
                      className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" />
          </div>
          <div>
            <label className="text-sm block mb-1">Department / By</label>
            <input value={by} onChange={e=>setBy(e.target.value)}
                   className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" />
          </div>
          <div>
            <label className="text-sm block mb-1">Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                   className="w-full rounded border border-[var(--color-border)] px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" />
          </div>
          <div className="text-right">
            <button className="px-4 py-2 rounded bg-[var(--color-accent)] text-white">Publish</button>
          </div>
        </form>
      </Section>
    </Layout>
  );
}
