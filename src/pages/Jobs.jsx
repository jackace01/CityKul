import { useMemo, useState } from "react";
import Layout from "../components/Layout";
import Card from "../components/Card";
import Section from "../components/Section";
import { latestJobs } from "../lib/data";
import { Link } from "react-router-dom";
import { isMember } from "../lib/auth";

export default function Jobs() {
  const [type, setType] = useState("All");
  const member = isMember();
  const types = ["All", ...new Set(latestJobs.map((j) => j.type))];

  const filtered = useMemo(
    () => latestJobs.filter((j) => (type === "All" ? true : j.type === type)),
    [type]
  );
  const top = filtered.slice(0, 5);

  return (
    <Layout>
      <Section title="Top Jobs">
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1 rounded-full border ${
                  type === t ? "bg-white text-black" : "border-[var(--color-border)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {member ? (
            <Link to="/submit-job" className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
              + Post Job
            </Link>
          ) : (
            <Link to="/membership" className="px-3 py-1 rounded bg-[var(--color-accent)] text-white">
              Become a member
            </Link>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {top.map((j, idx) => (
            <Card key={idx}>
              <h3 className="font-semibold">{j.title}</h3>
              <p className="text-sm text-[var(--color-muted)]">{j.org}</p>
              <p className="text-sm mt-1">{j.type}</p>
              <button className="mt-3 px-3 py-1 rounded bg-green-600 text-white">Apply</button>
            </Card>
          ))}
        </div>
      </Section>
    </Layout>
  );
}
