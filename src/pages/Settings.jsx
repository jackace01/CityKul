import Section from "../components/Section";

export default function Settings() {
  return (
    <Section title="Settings">
      <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
        <div>
          <label className="block text-sm mb-1">Preferred city</label>
          <input className="w-full rounded bg-neutral-950 border border-neutral-800 px-3 py-2" placeholder="e.g., Indore" />
        </div>
        <div>
          <label className="block text-sm mb-1">Notifications</label>
          <select className="w-full rounded bg-neutral-950 border border-neutral-800 px-3 py-2">
            <option>All</option><option>Important only</option><option>None</option>
          </select>
        </div>
      </div>
    </Section>
  );
}
