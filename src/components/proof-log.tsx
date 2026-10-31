import { presentation, type Proof } from "@/lib/beacon";
import { cn } from "@/lib/utils";

function clock(ms: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(ms);
}

export function ProofLog({
  draws,
  selectedId,
  onSelect,
}: {
  draws: Proof[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const visible = draws.slice(0, 8);

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 sm:p-6" aria-labelledby="log-title">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="log-title" className="font-display text-2xl text-foreground">
          Proof log
        </h2>
        <p className="font-mono text-xs tabular-nums text-muted">
          {visible.length} of {draws.length}
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="min-h-40 text-sm text-muted">Signed draws land here. Select one to inspect it.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((proof) => {
            const view = presentation(proof);
            const selected = proof.id === selectedId;
            return (
              <li key={proof.id}>
                <button
                  type="button"
                  onClick={() => onSelect(proof.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full flex-col gap-1 rounded-sm border px-3 py-3 text-left transition-[background-color,border-color] duration-150",
                    selected ? "border-foreground/30 bg-subtle" : "border-line bg-background hover:bg-subtle",
                  )}
                >
                  <span className="flex items-center justify-between gap-3 font-mono text-xs tabular-nums text-muted">
                    <span>{clock(proof.requestedAt)}</span>
                    <span>{proof.params.consumer}</span>
                    <span>{proof.latencyMs.toFixed(1)} ms</span>
                  </span>
                  <span className="truncate text-sm text-foreground">
                    {view.kicker} · {view.headline}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
