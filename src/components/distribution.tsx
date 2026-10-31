import { useEffect, useState } from "react";
import type { Proof } from "@/lib/beacon";

const BINS = 12;

function binsFor(draws: Proof[]) {
  const counts = Array.from({ length: BINS }, () => 0);
  for (const draw of draws) {
    const byte = Number.parseInt(draw.outputHex.slice(0, 2), 16);
    const index = Math.min(BINS - 1, Math.floor((byte / 256) * BINS));
    counts[index] = (counts[index] ?? 0) + 1;
  }
  return counts.map((count, index) => ({
    bin: String(index + 1).padStart(2, "0"),
    count,
  }));
}

type Charts = typeof import("recharts");

export function Distribution({ draws }: { draws: Proof[] }) {
  const [charts, setCharts] = useState<Charts | null>(null);

  useEffect(() => {
    let live = true;
    void import("recharts").then((mod) => {
      if (live) setCharts(mod);
    });
    return () => {
      live = false;
    };
  }, []);

  const data = binsFor(draws);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 sm:p-6" aria-labelledby="distribution-title">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="distribution-title" className="font-display text-2xl text-foreground">
          Distribution
        </h2>
        <p className="font-mono text-xs tabular-nums text-muted">{draws.length} draws</p>
      </div>
      {draws.length === 0 ? (
        <p className="min-h-40 text-sm text-muted">
          Bins fill as draws land. A uniform beacon sits flat across the range.
        </p>
      ) : charts ? (
        <div className="h-56 min-w-0">
          <charts.ResponsiveContainer width="100%" height="100%">
            <charts.BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <charts.CartesianGrid vertical={false} stroke="var(--color-line)" />
              <charts.XAxis
                dataKey="bin"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <charts.YAxis
                allowDecimals={false}
                width={28}
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <charts.Bar dataKey="count" fill="var(--color-foreground)" radius={[2, 2, 0, 0]} />
            </charts.BarChart>
          </charts.ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56" />
      )}
      <p className="mt-3 text-sm text-muted">First byte of each output, twelve equal bins.</p>
    </section>
  );
}
