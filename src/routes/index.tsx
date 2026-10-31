import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LiveKeeper } from "@/components/live-keeper";

export const Route = createFileRoute("/")({ component: Home });

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#integrate", label: "Quick start" },
  { href: "#try", label: "Try" },
];

const FEATURES = [
  {
    title: "Unbiased",
    body: "Two-party commit-reveal. Your random value is mixed with the next preimage of a committed hash chain. When the commitment holds, the keeper cannot swap the result.",
  },
  {
    title: "Verifiable",
    body: "Every reveal is checked with Keccak256. Anyone can recompute the word from your value and the preimage. The contract stores your value so the reveal cannot change it.",
  },
  {
    title: "Developer-first",
    body: "One request function. You approve the fee, pass 32 bytes, and read the word. Map it into a range in your own contract. No second token and no API key.",
  },
  {
    title: "Rewards-first",
    body: "The fee is 1 $RAREFRIENDS. transferFrom sends all of it to Rare Friends rewards. The keeper cut is zero. Active Friends take the rewards by weight.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Request",
    body: "Your contract calls request() with a user-generated random value. The caller pays the exact 1 $RAREFRIENDS fee, and that fee is pulled straight to rewards.",
  },
  {
    n: "02",
    title: "Reveal",
    body: "The keeper submits the next hash-chain preimage. Keccak256 of that preimage has to match the published commitment, so the keeper cannot pick a different one.",
  },
  {
    n: "03",
    title: "Callback",
    body: "The word is Keccak256 of your value, then the preimage. Your contract maps that word into a die, a trait, or a queue. The same bytes replay anywhere.",
  },
];

const SAMPLE = `interface IRareFriendsEntropy {
    function request(bytes32 userRandom) external returns (uint64);
    function fee() external view returns (uint256);
}

contract MyGame {
    IRareFriendsEntropy public immutable rng;
    IERC20 public immutable rarefriends;

    constructor(address rng_, address rarefriends_) {
        rng = IRareFriendsEntropy(rng_);
        rarefriends = IERC20(rarefriends_);
    }

    function roll(bytes32 userRandom) external {
        uint256 amount = rng.fee();
        rarefriends.transferFrom(msg.sender, address(this), amount);
        rarefriends.approve(address(rng), amount);
        rng.request(userRandom);
    }
}`;

function Home() {
  return (
    <div className="min-h-screen font-mono">
      <header className="sticky top-0 z-10 border-b border-line bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <a href="#top" className="text-sm text-foreground">
            Rare Friends
          </a>
          <nav className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="inline-flex h-11 items-center px-2 hover:text-foreground">
                {item.label}
              </a>
            ))}
            <a
              href="https://rarefriends.com/docs/rarefriends"
              className="inline-flex h-11 items-center px-2 hover:text-foreground"
            >
              $RAREFRIENDS
            </a>
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 py-12 sm:px-6 sm:py-20">
        <section className="max-w-3xl">
          <h1 className="text-4xl leading-[1.05] text-foreground sm:text-6xl">
            Real-time Randomness Layer
            <span className="mt-2 block text-muted">for Onchain Applications</span>
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Sub-second, verifiable randomness for games and other projects. Every request pays 1 $RAREFRIENDS.
            All of the fee goes to Rare Friends rewards.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href="#integrate">Read the quick start</a>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <a href="#try">Try a reveal</a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted">
            The keeper on this page is live. The contract is ready to deploy. There is no public-chain address yet,
            and there is no second coin.
          </p>
        </section>

        <dl className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4">
          <Spec value="1" unit="$RAREFRIENDS" label="Exact fee" />
          <Spec value="100%" label="To rewards" />
          <Spec value="0" label="Keeper cut" />
          <Spec value="Keccak256" label="Onchain check" />
        </dl>

        <section id="features" className="scroll-mt-24">
          <p className="text-sm text-muted">Features</p>
          <h2 className="mt-3 max-w-xl text-3xl leading-tight text-foreground sm:text-4xl">
            Built for developers who need real randomness.
          </h2>
          <div className="mt-8 grid gap-px bg-line sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="bg-background p-5 sm:p-6">
                <h3 className="text-base text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="scroll-mt-24">
          <p className="text-sm text-muted">How it works</p>
          <h2 className="mt-3 max-w-xl text-3xl leading-tight text-foreground sm:text-4xl">Three steps.</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Request, reveal, then use the word. If you are trying it here, the keeper answers in this app.
          </p>
          <ol className="mt-8 grid gap-px bg-line lg:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="bg-background p-5 sm:p-6">
                <p className="text-xs tabular-nums text-muted">{step.n}</p>
                <h3 className="mt-3 text-base text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="integrate" className="scroll-mt-24">
          <p className="text-sm text-muted">Quick start</p>
          <h2 className="mt-3 text-3xl leading-tight text-foreground sm:text-4xl">Integrate in one call.</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Approve the fee, then call request. The entropy contract forwards every token to rewards. It never holds
            the fee.
          </p>
          <p className="mt-6 text-xs text-muted">MyGame.sol</p>
          <pre className="mt-2 overflow-x-auto border border-line bg-card p-4 text-xs leading-relaxed text-foreground sm:p-6 sm:text-sm">
            {SAMPLE}
          </pre>
          <p className="mt-4 text-sm">
            <a
              href="/RareFriendsEntropy.sol"
              className="inline-flex h-11 items-center text-foreground underline decoration-line underline-offset-4"
            >
              RareFriendsEntropy.sol
            </a>
          </p>
        </section>

        <LiveKeeper />

        <section className="border border-line p-6 sm:p-10">
          <h2 className="max-w-xl text-3xl leading-tight text-foreground sm:text-4xl">
            Start building with onchain randomness.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-muted">
            No sign-up. No API key. Call the contract, pay 1 $RAREFRIENDS, and the fee goes to rewards.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <a href="#try">Try a reveal</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-muted sm:px-6">
          <p>© 2026 Rare Friends.</p>
          <p>Fee is 1 $RAREFRIENDS. 100% goes to rewards. Keeper cut is 0.</p>
        </div>
      </footer>
    </div>
  );
}

function Spec({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="bg-background px-4 py-5">
      <dd className="text-2xl text-foreground">
        {value}
        {unit ? <span className="ml-2 text-xs text-muted">{unit}</span> : null}
      </dd>
      <dt className="mt-2 text-xs text-muted">{label}</dt>
    </div>
  );
}
