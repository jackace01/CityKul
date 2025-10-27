import Layout from "../components/Layout";
import Section from "../components/Section";
import { isMember, getUser } from "../lib/auth";
import BecomeMemberButton from "../components/BecomeMemberButton";

export default function SubmitJob() {
  const member = isMember();
  const u = getUser();
  return (
    <Layout>
      <Section title="Submit Job">
        {!member ? (
          <div className="text-sm flex items-center gap-3">
            Only members can post jobs. <BecomeMemberButton />
          </div>
        ) : (
          <div className="grid gap-3 max-w-2xl">
            <div className="text-xs text-[var(--color-muted)]">
              Posting as <b>{u?.name}</b>
            </div>
            <input
              className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900"
              placeholder="Job title"
            />
            <input
              className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900"
              placeholder="Organization / Company"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <select className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900">
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Internship</option>
                <option>Contract</option>
              </select>
              <input
                className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900"
                placeholder="Salary / Stipend (optional)"
              />
            </div>
            <textarea
              rows={4}
              className="rounded px-3 py-2 border border-[var(--color-border)] bg-white dark:bg-gray-900"
              placeholder="Job description"
            ></textarea>
            <button className="mt-2 px-4 py-2 rounded bg-[var(--color-accent)] text-white">
              Submit for review (mock)
            </button>
          </div>
        )}
      </Section>
    </Layout>
  );
}
