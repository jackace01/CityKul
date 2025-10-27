import Section from "../components/Section";
import Card from "../components/Card";
import { useState } from "react";

export default function Submit() {
  const [type, setType] = useState("Event");

  return (
    <Section title="Submit Information">
      <Card>
        <div className="grid gap-3">
          <div>
            <label className="block text-sm mb-1">Type</label>
            <select value={type} onChange={e=>setType(e.target.value)}
              className="rounded bg-neutral-950 border border-neutral-800 px-3 py-2">
              <option>Event</option>
              <option>Job</option>
              <option>Marketplace</option>
              <option>City Issue</option>
              <option>Promotion</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input placeholder="Short title"
              className="w-full rounded bg-neutral-950 border border-neutral-800 px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm mb-1">Details</label>
            <textarea rows={4} placeholder="Add details, location, time, contact…"
              className="w-full rounded bg-neutral-950 border border-neutral-800 px-3 py-2"></textarea>
          </div>
          <button className="mt-2 px-4 py-2 rounded bg-blue-600">Submit for review</button>
        </div>
      </Card>
    </Section>
  );
}
