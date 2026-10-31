export type Consumer = "game" | "agent" | "defi" | "autonomous";

export type DrawParams =
  | { consumer: "game"; domain: string; sides: number }
  | { consumer: "agent"; domain: string; actions: string[] }
  | { consumer: "defi"; domain: string; queue: string[] }
  | { consumer: "autonomous"; domain: string; waypoints: string[] };

export type Proof = {
  id: string;
  params: DrawParams;
  requestedAt: number;
  fulfilledAt: number;
  latencyMs: number;
  phasesMs: { commit: number; sign: number; derive: number };
  clientSeed: string;
  clientCommitment: string;
  beaconEntropy: string;
  signature: string;
  publicKeySpki: string;
  fingerprint: string;
  outputHex: string;
};

export type Check = {
  id: "commitment" | "signature" | "output";
  label: string;
  ok: boolean;
  detail: string;
};

export type Verdict = { ok: boolean; checks: Check[] };

export type BeaconInfo = {
  fingerprint: string;
  publicKeySpki: string;
};

const DOMAIN_TAG = "RAREFRIENDS/1";
const OUTPUT_TAG = "RAREFRIENDS/OUT/1";

let privateKey: CryptoKey | null = null;
let opening: Promise<BeaconInfo> | null = null;
let currentInfo: BeaconInfo | null = null;

export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().replace(/^0x/, "");
  if (clean.length % 2 !== 0 || /[^0-9a-f]/i.test(clean)) {
    throw new Error("Malformed hex");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  return new Uint8Array(digest);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export function transcriptFor(proof: Pick<Proof, "params" | "id" | "clientCommitment" | "beaconEntropy" | "requestedAt">): string {
  return [
    DOMAIN_TAG,
    proof.params.domain,
    proof.params.consumer,
    proof.id,
    proof.clientCommitment,
    proof.beaconEntropy,
    String(proof.requestedAt),
  ].join("\n");
}

export function outputIndex(outputHex: string, length: number): number {
  if (length <= 0) throw new Error("Empty range");
  const bytes = hexToBytes(outputHex);
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) + BigInt(byte);
  return Number(value % BigInt(length));
}

export function shuffleWith(outputHex: string, items: string[]): string[] {
  const next = items.slice();
  const bytes = hexToBytes(outputHex);
  for (let i = next.length - 1; i > 0; i--) {
    const sample = (bytes[i % bytes.length] << 8) + bytes[(i * 7) % bytes.length];
    const j = sample % (i + 1);
    const swap = next[i];
    next[i] = next[j] ?? swap;
    next[j] = swap;
  }
  return next;
}

export function presentation(proof: Pick<Proof, "params" | "outputHex">): {
  kicker: string;
  headline: string;
  detail: string;
  rows?: string[];
} {
  const { params, outputHex } = proof;
  if (params.consumer === "game") {
    const face = outputIndex(outputHex, params.sides) + 1;
    return {
      kicker: `d${params.sides}`,
      headline: String(face),
      detail: `Face ${face} of ${params.sides}. Full-width modulo of the 256-bit output.`,
    };
  }
  if (params.consumer === "agent") {
    const index = outputIndex(outputHex, params.actions.length);
    const chosen = params.actions[index] ?? "—";
    return {
      kicker: "Agent action",
      headline: chosen,
      detail: `Index ${index + 1} of ${params.actions.length}. The agent does not choose.`,
    };
  }
  if (params.consumer === "defi") {
    const ordered = shuffleWith(outputHex, params.queue);
    return {
      kicker: "Liquidation queue",
      headline: ordered[0] ?? "—",
      detail: "Fisher–Yates over the output bytes. First address is next.",
      rows: ordered,
    };
  }
  const index = outputIndex(outputHex, params.waypoints.length);
  const chosen = params.waypoints[index] ?? "—";
  return {
    kicker: "Next waypoint",
    headline: chosen,
    detail: `Index ${index + 1} of ${params.waypoints.length}. Policy stays unbiased.`,
  };
}

function flipLastNibble(hex: string): string {
  if (!hex) return "00";
  const chars = hex.split("");
  const last = chars[chars.length - 1] ?? "0";
  const flipped = ((Number.parseInt(last, 16) + 1) % 16).toString(16);
  chars[chars.length - 1] = flipped;
  return chars.join("");
}

export function corruptSignature(proof: Proof): Proof {
  return { ...proof, signature: flipLastNibble(proof.signature) };
}

async function actuallyOpen(): Promise<BeaconInfo> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  privateKey = pair.privateKey;
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const digest = await sha256(spki);
  const fingerprint = `${bytesToHex(digest.slice(0, 2))}·${bytesToHex(digest.slice(2, 4))}`;
  currentInfo = { fingerprint, publicKeySpki: bytesToBase64(spki) };
  return currentInfo;
}

export function openBeacon(): Promise<BeaconInfo> {
  if (!opening) {
    opening = actuallyOpen().catch((error: unknown) => {
      opening = null;
      throw error;
    });
  }
  return opening;
}

export function beaconSnapshot(): BeaconInfo | null {
  return currentInfo;
}

export async function fulfill(params: DrawParams): Promise<Proof> {
  const info = await openBeacon();
  if (!privateKey) throw new Error("Beacon key is missing");

  const started = performance.now();
  const requestedAt = Date.now();
  const id = crypto.randomUUID();

  const clientSeedBytes = crypto.getRandomValues(new Uint8Array(32));
  const commitmentBytes = await sha256(clientSeedBytes);
  const clientSeed = bytesToHex(clientSeedBytes);
  const clientCommitment = bytesToHex(commitmentBytes);
  const commitDone = performance.now();

  const beaconEntropyBytes = crypto.getRandomValues(new Uint8Array(32));
  const beaconEntropy = bytesToHex(beaconEntropyBytes);
  const draft: Pick<Proof, "params" | "id" | "clientCommitment" | "beaconEntropy" | "requestedAt"> = {
    params,
    id,
    clientCommitment,
    beaconEntropy,
    requestedAt,
  };
  const transcript = transcriptFor(draft);
  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      toArrayBuffer(utf8(transcript)),
    ),
  );
  const signature = bytesToHex(signatureBytes);
  const signDone = performance.now();

  const outputBytes = await sha256(
    utf8(`${OUTPUT_TAG}\n${clientSeed}\n${beaconEntropy}\n${signature}`),
  );
  const deriveDone = performance.now();

  const proof: Proof = {
    id,
    params,
    requestedAt,
    fulfilledAt: Date.now(),
    latencyMs: deriveDone - started,
    phasesMs: {
      commit: commitDone - started,
      sign: signDone - commitDone,
      derive: deriveDone - signDone,
    },
    clientSeed,
    clientCommitment,
    beaconEntropy,
    signature,
    publicKeySpki: info.publicKeySpki,
    fingerprint: info.fingerprint,
    outputHex: bytesToHex(outputBytes),
  };

  const verdict = await verifyProof(proof);
  if (!verdict.ok) {
    throw new Error(verdict.checks.find((check) => !check.ok)?.detail ?? "Self-check failed");
  }
  return proof;
}

export async function verifyProof(proof: Proof): Promise<Verdict> {
  const checks: Check[] = [];

  let commitmentOk = false;
  let commitmentDetail = "Recomputed SHA-256 of the revealed seed.";
  try {
    const digest = bytesToHex(await sha256(hexToBytes(proof.clientSeed)));
    commitmentOk = digest === proof.clientCommitment;
    if (!commitmentOk) commitmentDetail = "Revealed seed does not hash to the commitment.";
  } catch {
    commitmentDetail = "Seed or commitment is not valid hex.";
  }
  checks.push({
    id: "commitment",
    label: "Commitment",
    ok: commitmentOk,
    detail: commitmentDetail,
  });

  let signatureOk = false;
  let signatureDetail = "ECDSA P-256 signature over the transcript.";
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      toArrayBuffer(base64ToBytes(proof.publicKeySpki)),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    signatureOk = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      toArrayBuffer(hexToBytes(proof.signature)),
      toArrayBuffer(utf8(transcriptFor(proof))),
    );
    if (!signatureOk) signatureDetail = "Signature does not match this beacon key and transcript.";
  } catch {
    signatureDetail = "Signature or public key could not be parsed.";
  }
  checks.push({
    id: "signature",
    label: "Signature",
    ok: signatureOk,
    detail: signatureDetail,
  });

  let outputOk = false;
  let outputDetail = "Output is the hash of seed, beacon entropy, and signature.";
  try {
    const derived = bytesToHex(
      await sha256(utf8(`${OUTPUT_TAG}\n${proof.clientSeed}\n${proof.beaconEntropy}\n${proof.signature}`)),
    );
    outputOk = derived === proof.outputHex;
    if (!outputOk) outputDetail = "Output bytes are not bound to this transcript.";
  } catch {
    outputDetail = "Output material is not valid hex.";
  }
  checks.push({
    id: "output",
    label: "Output bind",
    ok: outputOk,
    detail: outputDetail,
  });

  return { ok: checks.every((check) => check.ok), checks };
}
