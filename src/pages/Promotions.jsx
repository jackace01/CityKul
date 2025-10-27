import Layout from "../components/Layout";
import Section from "../components/Section";
import Card from "../components/Card";
import { deals } from "../lib/data";

export default function Promotions() {
  const top = deals.slice(0, 5);
  return (
    <Layout>
      <Section title="Promotions (Sponsored)">
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-3">
          {top.map((d, idx)=>(
            <Card key={idx}>
              <h3 className="font-semibold">{d.title}</h3>
              <p className="text-sm text-[var(--color-muted)]">{d.where}</p>
              <button className="mt-3 px-3 py-1 rounded ring-1 ring-[var(--color-border)]">Details</button>
            </Card>
          ))}
        </div>
      </Section>
    </Layout>
  );
}
