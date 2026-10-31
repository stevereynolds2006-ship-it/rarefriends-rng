const STEPS = [
  {
    n: "01",
    title: "Commit",
    body: "The requester seals 32 bytes and shows only the hash. The beacon never needs the seed to sign.",
  },
  {
    n: "02",
    title: "Sign",
    body: "The beacon mixes its own entropy and signs the transcript with an ECDSA P-256 key.",
  },
  {
    n: "03",
    title: "Bind",
    body: "The output is SHA-256 of the revealed seed, the beacon entropy, and the signature. Move one byte and the check fails.",
  },
  {
    n: "04",
    title: "Spend",
    body: "Games, agents, queues, and waypoints map that integer with a pure function, so the same proof replays anywhere.",
  },
];

export function Protocol() {
  return (
    <section id="protocol" className="scroll-mt-24" aria-labelledby="protocol-title">
      <div className="max-w-2xl">
        <p className="text-sm text-muted">Protocol</p>
        <h2 id="protocol-title" className="mt-2 font-display text-4xl text-foreground">
          Four steps. No hidden roll.
        </h2>
        <p className="mt-4 text-base text-muted">
          This console runs the beacon in your tab so you can read every byte. The proof shape is what a
          verifier — a contract, an agent, another service — would check.
        </p>
      </div>
      <ol className="mt-8 grid gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-2">
        {STEPS.map((step) => (
          <li key={step.n} className="bg-card p-5 sm:p-6">
            <p className="font-mono text-xs tabular-nums text-muted">{step.n}</p>
            <h3 className="mt-3 font-display text-2xl text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
