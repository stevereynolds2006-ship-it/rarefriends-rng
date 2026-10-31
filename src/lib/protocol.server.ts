import { getSql } from "@/lib/db";
import { bytesToHex, hexToBytes, type Consumer } from "@/lib/beacon";
import {
  CHAIN_LENGTH,
  FEE_UNITS,
  cursorAt,
  deriveReveal,
  mixRandom,
  type KeeperStatus,
  type LiveDraw,
  type ServiceProject,
} from "@/lib/protocol";

type ProviderRow = {
  seed_hex: string;
  root_hex: string;
  chain_length: number;
  sequence: number;
};

type DrawRow = {
  sequence: number;
  domain: string;
  consumer: string;
  user_random: string;
  commitment_before: string;
  provider_reveal: string;
  random_number: string;
  requested_at_ms: number;
  latency_ms: number;
};

function randomSeed(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function ensureProvider(): Promise<ProviderRow> {
  const sql = await getSql();
  const existing = await sql<ProviderRow>`
    select seed_hex, root_hex, chain_length, sequence
    from pyxis_provider
    where id = 1
  `;
  if (existing[0]) return existing[0];

  const seed = randomSeed();
  const root = bytesToHex(cursorAt(seed, CHAIN_LENGTH, 0));
  await sql`
    insert into pyxis_provider (id, seed_hex, root_hex, chain_length, sequence, created_at_ms)
    values (1, ${bytesToHex(seed)}, ${root}, ${CHAIN_LENGTH}, 0, ${Date.now()})
    on conflict (id) do nothing
  `;
  const created = await sql<ProviderRow>`
    select seed_hex, root_hex, chain_length, sequence
    from pyxis_provider
    where id = 1
  `;
  const row = created[0];
  if (!row) throw new Error("Keeper failed to start");
  return row;
}

function toDraw(row: DrawRow): LiveDraw {
  return {
    sequence: Number(row.sequence),
    domain: row.domain,
    consumer: row.consumer as Consumer,
    userRandom: row.user_random,
    commitmentBefore: row.commitment_before,
    providerReveal: row.provider_reveal,
    randomNumber: row.random_number,
    requestedAtMs: Number(row.requested_at_ms),
    latencyMs: Number(row.latency_ms),
  };
}

export async function readKeeperStatus(): Promise<KeeperStatus> {
  const provider = await ensureProvider();
  const sql = await getSql();
  const sequence = Number(provider.sequence);
  const chainLength = Number(provider.chain_length);
  const commitment = bytesToHex(cursorAt(hexToSeed(provider.seed_hex), chainLength, sequence));
  const totals = await sql<{ fees: number }>`
    select coalesce(sum(fee_units), 0) as fees from pyxis_draws
  `;
  const projects = await sql<ServiceProject>`
    select domain as slug, count(*) as draws, coalesce(sum(fee_units), 0) as fees
    from pyxis_draws
    group by domain
    order by draws desc, domain asc
    limit 8
  `;
  return {
    root: provider.root_hex,
    commitment,
    sequence,
    remaining: Math.max(0, chainLength - sequence),
    chainLength,
    feeUnits: FEE_UNITS,
    rewardsRouted: Number(totals[0]?.fees ?? 0),
    projects: projects.map((project) => ({
      slug: project.slug,
      draws: Number(project.draws),
      fees: Number(project.fees),
    })),
  };
}

function hexToSeed(hex: string): Uint8Array {
  return hexToBytes(hex);
}

export async function revealDraw(input: {
  domain: string;
  consumer: Consumer;
  userRandom: string;
}): Promise<LiveDraw> {
  const started = Date.now();
  const sql = await getSql();
  await ensureProvider();

  const claimed = await sql<{ sequence: number; seed_hex: string; chain_length: number }>`
    update pyxis_provider
    set sequence = sequence + 1
    where id = 1 and sequence < chain_length
    returning sequence, seed_hex, chain_length
  `;
  const slot = claimed[0];
  if (!slot) throw new Error("Hash chain is exhausted");

  const sequence = Number(slot.sequence) - 1;
  const seed = hexToSeed(slot.seed_hex);
  const derived = deriveReveal(seed, Number(slot.chain_length), sequence);
  const randomNumber = mixRandom(input.userRandom, derived.providerReveal);
  const latencyMs = Date.now() - started;

  await sql`
    insert into pyxis_draws (
      sequence, domain, consumer, user_random, commitment_before,
      provider_reveal, random_number, requested_at_ms, latency_ms, fee_units
    ) values (
      ${sequence},
      ${input.domain},
      ${input.consumer},
      ${input.userRandom},
      ${derived.commitmentBefore},
      ${derived.providerReveal},
      ${randomNumber},
      ${started},
      ${latencyMs},
      ${FEE_UNITS}
    )
  `;

  return {
    sequence,
    domain: input.domain,
    consumer: input.consumer,
    userRandom: input.userRandom,
    commitmentBefore: derived.commitmentBefore,
    providerReveal: derived.providerReveal,
    randomNumber,
    requestedAtMs: started,
    latencyMs,
  };
}

export async function listKeeperDraws(): Promise<LiveDraw[]> {
  const sql = await getSql();
  await ensureProvider();
  const rows = await sql<DrawRow>`
    select sequence, domain, consumer, user_random, commitment_before,
           provider_reveal, random_number, requested_at_ms, latency_ms
    from pyxis_draws
    order by sequence desc
    limit 8
  `;
  return rows.map(toDraw);
}
