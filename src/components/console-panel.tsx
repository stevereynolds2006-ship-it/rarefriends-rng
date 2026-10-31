import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  corruptSignature,
  presentation,
  verifyProof,
  type Check as ProofCheck,
  type Consumer,
  type DrawParams,
  type Proof,
  type Verdict,
} from "@/lib/beacon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONSUMERS: { id: Consumer; label: string; note: string }[] = [
  {
    id: "game",
    label: "Game",
    note: "Map the output onto a fair face. Loot and crits use the same function.",
  },
  {
    id: "agent",
    label: "Agent",
    note: "Break a tie the agent must not decide alone.",
  },
  {
    id: "defi",
    label: "DeFi",
    note: "Shuffle a liquidation queue without a privileged operator.",
  },
  {
    id: "autonomous",
    label: "Autonomous",
    note: "Pick the next waypoint when the policy must stay unbiased.",
  },
];

const FIELD =
  "w-full rounded-sm border border-line bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-foreground/30";

const SLA_MS = 250;

function linesOf(value: string, max: number): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

function formatMs(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)} ms`;
}

export function ConsolePanel({
  proof,
  busy,
  ready,
  error,
  onRequest,
  historical = false,
}: {
  proof: Proof | null;
  busy: boolean;
  ready: boolean;
  error: string | null;
  onRequest: (params: DrawParams) => Promise<void>;
  historical?: boolean;
}) {
  const [consumer, setConsumer] = useState<Consumer>("game");
  const [domain, setDomain] = useState("app.game.roll");
  const [sides, setSides] = useState(20);
  const [actions, setActions] = useState("Observe\nProbe\nHold\nWithdraw");
  const [queue, setQueue] = useState("0xA41c…91e\n0x19e2…0ab\n0xC077…44d\n0x8B04…c12\n0x33aa…7f0");
  const [waypoints, setWaypoints] = useState("North lock\nEast span\nSouth yard\nWest gate");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tampered, setTampered] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [checking, setChecking] = useState(false);

  const active = CONSUMERS.find((item) => item.id === consumer) ?? CONSUMERS[0];

  const params = useMemo((): DrawParams | null => {
    const cleanDomain = domain.trim().slice(0, 64);
    if (!cleanDomain) return null;
    if (consumer === "game") {
      const nextSides = Math.round(sides);
      if (nextSides < 2 || nextSides > 1000) return null;
      return { consumer, domain: cleanDomain, sides: nextSides };
    }
    if (consumer === "agent") {
      const list = linesOf(actions, 8);
      if (list.length < 2) return null;
      return { consumer, domain: cleanDomain, actions: list };
    }
    if (consumer === "defi") {
      const list = linesOf(queue, 8);
      if (list.length < 2) return null;
      return { consumer, domain: cleanDomain, queue: list };
    }
    const list = linesOf(waypoints, 8);
    if (list.length < 2) return null;
    return { consumer, domain: cleanDomain, waypoints: list };
  }, [actions, consumer, domain, queue, sides, waypoints]);

  const shown = useMemo(() => {
    if (!proof) return null;
    return tampered ? corruptSignature(proof) : proof;
  }, [proof, tampered]);

  useEffect(() => {
    setTampered(false);
    setCopied(false);
  }, [proof?.id]);

  useEffect(() => {
    if (!shown) {
      setVerdict(null);
      return;
    }
    let live = true;
    setChecking(true);
    void verifyProof(shown).then((next) => {
      if (!live) return;
      setVerdict(next);
      setChecking(false);
    });
    return () => {
      live = false;
    };
  }, [shown]);

  useEffect(() => {
    if (!streaming || !params) return;
    let ticks = 0;
    let timer = 0;
    const pump = () => {
      ticks += 1;
      if (ticks > 24) {
        setStreaming(false);
        return;
      }
      void onRequest(params);
      timer = window.setTimeout(pump, 680);
    };
    pump();
    return () => window.clearTimeout(timer);
  }, [onRequest, params, streaming]);

  const view = proof ? presentation(proof) : null;
  const meter = proof ? Math.min(100, (proof.latencyMs / SLA_MS) * 100) : 0;

  function setConsumerAndDomain(next: Consumer) {
    setConsumer(next);
    const domains: Record<Consumer, string> = {
      game: "app.game.roll",
      agent: "app.agent.choice",
      defi: "app.defi.queue",
      autonomous: "app.auto.waypoint",
    };
    setDomain(domains[next]);
    setStreaming(false);
  }

  async function copyProof() {
    if (!proof) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(proof, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="console" className="scroll-mt-24" aria-labelledby="console-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Console</p>
          <h2 id="console-title" className="mt-2 font-display text-4xl text-foreground">
            Request a draw
          </h2>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <form
          className="rounded-xl border border-line bg-card p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!params || !ready) return;
            setStreaming(false);
            void onRequest(params);
          }}
        >
          <p className="text-sm font-medium text-foreground">Consumer</p>
          <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Consumer">
            {CONSUMERS.map((item) => {
              const selected = item.id === consumer;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setConsumerAndDomain(item.id)}
                  className={cn(
                    "h-11 rounded-sm border text-sm font-medium transition-[background-color,border-color,color] duration-150",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-line bg-background text-foreground hover:bg-subtle",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted">{active?.note}</p>

          <label className="mt-6 block">
            <span className="text-sm font-medium text-foreground">Domain</span>
            <input
              className={cn(FIELD, "mt-2 h-11 font-mono")}
              value={domain}
              spellCheck={false}
              maxLength={64}
              onChange={(event) => setDomain(event.target.value)}
            />
          </label>

          {consumer === "game" ? (
            <div className="mt-6">
              <p className="text-sm font-medium text-foreground">Faces</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[6, 20, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={sides === value}
                    onClick={() => setSides(value)}
                    className={cn(
                      "h-11 min-w-16 rounded-sm border px-3 font-mono text-sm tabular-nums",
                      sides === value
                        ? "border-foreground bg-foreground text-background"
                        : "border-line bg-background text-foreground hover:bg-subtle",
                    )}
                  >
                    d{value}
                  </button>
                ))}
                <input
                  className={cn(FIELD, "h-11 w-24 font-mono tabular-nums")}
                  inputMode="numeric"
                  aria-label="Custom face count"
                  value={sides}
                  onChange={(event) => setSides(Number(event.target.value))}
                />
              </div>
            </div>
          ) : null}

          {consumer === "agent" ? (
            <label className="mt-6 block">
              <span className="text-sm font-medium text-foreground">Actions</span>
              <textarea
                className={cn(FIELD, "mt-2 min-h-32 py-3")}
                value={actions}
                onChange={(event) => setActions(event.target.value)}
              />
            </label>
          ) : null}

          {consumer === "defi" ? (
            <label className="mt-6 block">
              <span className="text-sm font-medium text-foreground">Queue</span>
              <textarea
                className={cn(FIELD, "mt-2 min-h-32 py-3 font-mono")}
                value={queue}
                spellCheck={false}
                onChange={(event) => setQueue(event.target.value)}
              />
            </label>
          ) : null}

          {consumer === "autonomous" ? (
            <label className="mt-6 block">
              <span className="text-sm font-medium text-foreground">Waypoints</span>
              <textarea
                className={cn(FIELD, "mt-2 min-h-32 py-3")}
                value={waypoints}
                onChange={(event) => setWaypoints(event.target.value)}
              />
            </label>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button type="submit" size="lg" className="w-full sm:flex-1" disabled={!ready || !params || busy}>
              {busy ? "Signing" : ready ? "Request draw" : "Waking beacon"}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={!ready || !params}
              aria-pressed={streaming}
              onClick={() => setStreaming((value) => !value)}
            >
              {streaming ? "Stop stream" : "Stream"}
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          {!params ? <p className="mt-3 text-sm text-muted">Need a domain and at least two options.</p> : null}
        </form>

        <div className="flex min-w-0 flex-col rounded-xl border border-line bg-card p-4 sm:p-6" aria-live="polite">
          {!proof || !view || !shown ? (
            <div className="flex flex-1 flex-col justify-end">
              <p className="font-display text-3xl text-foreground">Waiting on the first signature.</p>
              <p className="mt-3 max-w-md text-sm text-muted">
                A draw returns entropy, a transcript, and an ECDSA signature. You can check it, or break it.
              </p>
            </div>
          ) : (
            <div key={proof.id} className="rise flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-sm px-2 text-sm font-medium",
                    tampered || verdict?.ok === false ? "bg-subtle text-danger" : "bg-subtle text-ok",
                  )}
                >
                  {tampered || verdict?.ok === false ? (
                    <ShieldAlert className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {checking ? "Checking" : verdict?.ok ? "Verified" : "Rejected"}
                </span>
                <span className="font-mono text-sm tabular-nums text-muted">
                  {historical ? "Earlier draw · " : ""}
                  {formatMs(proof.latencyMs)}
                </span>
              </div>

              <p className="mt-6 text-sm text-muted">{view.kicker}</p>
              <p className="mt-1 break-words font-display text-5xl leading-none text-foreground sm:text-6xl">
                {view.headline}
              </p>
              <p className="mt-3 text-sm text-muted">{view.detail}</p>

              {view.rows ? (
                <ol className="mt-4 flex flex-col gap-1">
                  {view.rows.map((row, index) => (
                    <li key={`${row}-${index}`} className="flex items-baseline gap-3 font-mono text-sm">
                      <span className="w-6 tabular-nums text-muted">{String(index + 1).padStart(2, "0")}</span>
                      <span className={index === 0 ? "text-foreground" : "text-muted"}>{row}</span>
                    </li>
                  ))}
                </ol>
              ) : null}

              <div className="mt-6">
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted">
                  <span>Budget {SLA_MS} ms</span>
                  <span>
                    commit {proof.phasesMs.commit.toFixed(1)} · sign {proof.phasesMs.sign.toFixed(1)} · bind{" "}
                    {proof.phasesMs.derive.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-sm bg-subtle">
                  <div className="h-full bg-foreground" style={{ width: `${meter}%` }} />
                </div>
              </div>

              <ul className="mt-6 flex flex-col gap-2">
                {(verdict?.checks ?? []).map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </ul>

              <p className="mt-4 break-all font-mono text-xs text-muted">0x{proof.outputHex}</p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button variant="secondary" className="w-full sm:w-auto" onClick={() => void copyProof()}>
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy proof"}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  aria-pressed={tampered}
                  onClick={() => setTampered((value) => !value)}
                >
                  {tampered ? "Restore signature" : "Corrupt signature"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CheckRow({ check }: { check: ProofCheck }) {
  return (
    <li className="flex items-start justify-between gap-4 border-t border-line pt-2">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{check.label}</p>
        <p className="text-sm text-muted">{check.detail}</p>
      </div>
      <span className={cn("shrink-0 font-mono text-xs", check.ok ? "text-ok" : "text-danger")}>
        {check.ok ? "ok" : "fail"}
      </span>
    </li>
  );
}
