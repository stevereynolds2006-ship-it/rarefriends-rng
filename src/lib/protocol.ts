import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex, hexToBytes, outputIndex, type Consumer } from "@/lib/beacon";

export const SERVICE_TOKEN = "RAREFRIENDS";
export const FEE_UNITS = 1;
export const REWARDS_SINK = "Rare Friends rewards";
export const CHAIN_LENGTH = 2048;

export type LiveDraw = {
  sequence: number;
  domain: string;
  consumer: Consumer;
  userRandom: string;
  commitmentBefore: string;
  providerReveal: string;
  randomNumber: string;
  requestedAtMs: number;
  latencyMs: number;
};

export type ServiceProject = {
  slug: string;
  draws: number;
  fees: number;
};

export type KeeperStatus = {
  root: string;
  commitment: string;
  sequence: number;
  remaining: number;
  chainLength: number;
  feeUnits: number;
  rewardsRouted: number;
  projects: ServiceProject[];
};

export type LiveCheck = {
  id: "reveal" | "mix";
  label: string;
  ok: boolean;
  detail: string;
};

function keccak(data: Uint8Array): Uint8Array {
  return keccak_256(data);
}

export function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const out = new Uint8Array(left.length + right.length);
  out.set(left, 0);
  out.set(right, left.length);
  return out;
}

/** Hash-chain node `length - sequence` steps above the seed. */
export function cursorAt(seed: Uint8Array, length: number, sequence: number): Uint8Array {
  if (sequence < 0 || sequence > length) throw new Error("Sequence is outside the hash chain");
  let node = seed;
  const steps = length - sequence;
  for (let i = 0; i < steps; i += 1) node = keccak(node);
  return node;
}

export function deriveReveal(seed: Uint8Array, length: number, sequence: number): {
  commitmentBefore: string;
  providerReveal: string;
} {
  if (sequence >= length) throw new Error("Hash chain exhausted");
  return {
    commitmentBefore: bytesToHex(cursorAt(seed, length, sequence)),
    providerReveal: bytesToHex(cursorAt(seed, length, sequence + 1)),
  };
}

export function mixRandom(userRandomHex: string, providerRevealHex: string): string {
  const mixed = keccak(concatBytes(hexToBytes(userRandomHex), hexToBytes(providerRevealHex)));
  return bytesToHex(mixed);
}

export function verifyLiveDraw(draw: Pick<LiveDraw, "userRandom" | "commitmentBefore" | "providerReveal" | "randomNumber">): {
  ok: boolean;
  checks: LiveCheck[];
} {
  let revealOk = false;
  let revealDetail = "Keccak256 of the reveal matches the commitment that was current.";
  let mixOk = false;
  let mixDetail = "Random word is Keccak256 of your value, then the reveal.";
  try {
    const linked = bytesToHex(keccak(hexToBytes(draw.providerReveal)));
    revealOk = linked === draw.commitmentBefore;
    if (!revealOk) revealDetail = "Reveal is not the preimage of the published commitment.";
  } catch {
    revealDetail = "Reveal or commitment is not valid hex.";
  }
  try {
    const mixed = mixRandom(draw.userRandom, draw.providerReveal);
    mixOk = mixed === draw.randomNumber;
    if (!mixOk) mixDetail = "Random word does not match your value and the reveal.";
  } catch {
    mixDetail = "Your value or the reveal is not valid hex.";
  }
  const checks: LiveCheck[] = [
    { id: "reveal", label: "Hash chain", ok: revealOk, detail: revealDetail },
    { id: "mix", label: "Two-party mix", ok: mixOk, detail: mixDetail },
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

export function faceFromRandom(randomNumber: string, sides: number): number {
  return outputIndex(randomNumber, sides) + 1;
}
