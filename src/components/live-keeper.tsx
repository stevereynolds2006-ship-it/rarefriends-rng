import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { bytesToHex } from "@/lib/beacon";
import { faceFromRandom, verifyLiveDraw, FEE_UNITS, REWARDS_SINK, SERVICE_TOKEN, type KeeperStatus, type LiveDraw } from "@/lib/protocol";
import { getKeeperStatus, listLiveDraws, requestLiveDraw } from "@/lib/protocol.fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

function short(hex: string): string {
  if (hex.length < 16) return hex;
  return `${hex.slice(0, 8)}…${hex.slice(-6)}`;
}

export function LiveKeeper() {
  const [status, setStatus] = useState<KeeperStatus | null>(null);
  const [draws, setDraws] = useState<LiveDraw[]>([]);
  const [domain, setDomain] = useState("rare-friends");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<LiveDraw | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([getKeeperStatus(), listLiveDraws()])
      .then(([nextStatus, nextDraws]) => {
        if (!live) return;
        setStatus(nextStatus);
        setDraws(nextDraws);
        setLatest(nextDraws[0] ?? null);
      })
      .catch((reason: unknown) => {
        if (!live) return;
        setError(reason instanceof Error ? reason.message : "Keeper is not answering");
      });
    return () => {
      live = false;
    };
  }, []);

  const verdict = latest ? verifyLiveDraw(latest) : null;
  const domainOk = SLUG.test(domain);

  async function onRequest() {
    if (!domainOk || busy) return;
    setBusy(true);
    setError(null);
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    try {
      const draw = await requestLiveDraw({
        data: { domain, consumer: "game", userRandom: bytesToHex(bytes) },
      });
      const [nextStatus, nextDraws] = await Promise.all([getKeeperStatus(), listLiveDraws()]);
      setLatest(draw);
      setStatus(nextStatus);
      setDraws(nextDraws);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Reveal failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="try" className="scroll-mt-24" aria-labelledby="keeper-title">
      <div className="max-w-2xl">
        <p className="text-sm text-muted">Try</p>
        <h2 id="keeper-title" className="mt-3 font-mono text-3xl leading-tight text-foreground sm:text-4xl">
          Request a reveal.
        </h2>
        <p className="mt-4 text-muted">
          Your games and other projects call the same keeper. Each reveal costs {FEE_UNITS} ${SERVICE_TOKEN}.
          The contract pulls that fee straight to {REWARDS_SINK}. There is no second coin, and the keeper keeps nothing.
        </p>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
        <Stat label="Fee" value={String(FEE_UNITS)} unit={SERVICE_TOKEN} />
        <Stat label="To rewards" value="100" unit="%" />
        <Stat label="Routed" value={status ? String(status.rewardsRouted) : "—"} unit={status ? SERVICE_TOKEN : undefined} />
        <Stat label="Projects" value={status ? String(status.projects.length) : "—"} />
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          className="border border-line bg-card p-4 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void onRequest();
          }}
        >
          <label className="block">
            <span className="text-sm font-medium text-foreground">Project</span>
            <input
              className="mt-2 h-11 w-full rounded-sm border border-line bg-background px-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              value={domain}
              spellCheck={false}
              maxLength={32}
              onChange={(event) => setDomain(event.target.value.toLowerCase())}
            />
          </label>
          <p className="mt-3 text-sm text-muted">
            Use rare-friends for yours. Another project uses its own slug and pays the same fee into the same rewards.
          </p>
          <p className="mt-4 break-all font-mono text-xs text-muted">
            Root {status ? `0x${short(status.root)}` : "waking"}
          </p>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={!status || !domainOk || busy}>
            {busy ? "Keeper revealing" : status ? "Request reveal" : "Waking keeper"}
          </Button>
          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
          {!domainOk ? <p className="mt-3 text-sm text-muted">Use a lowercase slug, like rare-friends or other-game.</p> : null}
        </form>

        <div className="flex min-w-0 flex-col border border-line bg-card p-4 sm:p-6" aria-live="polite">
          {!latest || !verdict ? (
            <div className="flex flex-1 flex-col justify-end">
              <p className="font-mono text-3xl text-foreground">No reveal yet.</p>
              <p className="mt-3 text-sm text-muted">
                The keeper returns a 32-byte word. Map it the same way you would map a die or a trait table.
              </p>
            </div>
          ) : (
            <div key={latest.sequence} className="rise">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={cn(
                    "inline-flex h-8 items-center gap-2 rounded-sm bg-subtle px-2 text-sm font-medium",
                    verdict.ok ? "text-ok" : "text-danger",
                  )}
                >
                  {verdict.ok ? (
                    <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  )}
                  {verdict.ok ? "Verified" : "Rejected"}
                </span>
                <span className="font-mono text-sm tabular-nums text-muted">
                  #{latest.sequence} · {latest.latencyMs} ms
                </span>
              </div>
              <p className="mt-6 text-sm text-muted">d20 from the word</p>
              <p className="mt-1 font-mono text-5xl leading-none text-foreground">{faceFromRandom(latest.randomNumber, 20)}</p>
              <ul className="mt-6 flex flex-col gap-2">
                {verdict.checks.map((check) => (
                  <li key={check.id} className="flex items-start justify-between gap-4 border-t border-line pt-2">
                    <div>
                      <p className="text-sm text-foreground">{check.label}</p>
                      <p className="text-sm text-muted">{check.detail}</p>
                    </div>
                    <span className={cn("shrink-0 font-mono text-xs", check.ok ? "text-ok" : "text-danger")}>
                      {check.ok ? "ok" : "fail"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 break-all font-mono text-xs text-muted">0x{latest.randomNumber}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="border border-line bg-card p-4 sm:p-6">
          <h3 className="font-mono text-2xl text-foreground">Recent reveals</h3>
          {draws.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Shared across this app. The first reveal lands here.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {draws.map((draw) => {
                const ok = verifyLiveDraw(draw).ok;
                return (
                  <li key={draw.sequence}>
                    <button
                      type="button"
                      onClick={() => setLatest(draw)}
                      className="flex w-full items-center justify-between gap-3 rounded-sm border border-line bg-background px-3 py-3 text-left hover:bg-subtle"
                    >
                      <span className="font-mono text-xs tabular-nums text-muted">#{draw.sequence}</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{draw.domain}</span>
                      <span className={cn("font-mono text-xs", ok ? "text-ok" : "text-danger")}>{ok ? "ok" : "fail"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="border border-line bg-card p-4 sm:p-6">
          <h3 className="font-mono text-2xl text-foreground">${SERVICE_TOKEN}</h3>
          <p className="mt-3 text-sm text-muted">
            Callers pay {FEE_UNITS} ${SERVICE_TOKEN}. <span className="text-foreground">transferFrom</span> sends
            all of it to {REWARDS_SINK}. Active Friends take that by reward weight. Holding the token alone does
            not. The keeper and this contract take zero.
          </p>
          <dl className="mt-5 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Coin</dt>
              <dd className="font-mono text-foreground">${SERVICE_TOKEN}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Keeper cut</dt>
              <dd className="font-mono text-foreground">0</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Ledger</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {status ? status.rewardsRouted : "—"} {SERVICE_TOKEN}
              </dd>
            </div>
          </dl>
          {status && status.projects.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {status.projects.map((project) => (
                <li key={project.slug} className="flex items-center justify-between gap-3 font-mono text-xs">
                  <span className="truncate text-foreground">{project.slug}</span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {project.draws} · {project.fees} {SERVICE_TOKEN}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No project has called yet.</p>
          )}
          <p className="mt-4 text-sm text-muted">
            This ledger counts ${SERVICE_TOKEN} the contract would route. It is not a token transfer until you deploy.
          </p>
          <p className="mt-4 break-all font-mono text-xs text-muted">root 0x{status?.root ?? "—"}</p>
          <a
            href="/RareFriendsEntropy.sol"
            className="mt-4 inline-flex h-11 items-center text-sm text-foreground underline decoration-line underline-offset-4"
          >
            RareFriendsEntropy.sol
          </a>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-card px-4 py-4 sm:px-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-2 font-mono text-2xl tabular-nums text-foreground">
        {value}
        {unit ? <span className="ml-1 text-sm text-muted">{unit}</span> : null}
      </dd>
    </div>
  );
}
