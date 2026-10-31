import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const requestSchema = z.object({
  domain: z.string().regex(/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/),
  consumer: z.enum(["game", "agent", "defi", "autonomous"]),
  userRandom: z.string().regex(/^[0-9a-f]{64}$/),
});

export const getKeeperStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { readKeeperStatus } = await import("@/lib/protocol.server");
  return readKeeperStatus();
});

export const listLiveDraws = createServerFn({ method: "GET" }).handler(async () => {
  const { listKeeperDraws } = await import("@/lib/protocol.server");
  return listKeeperDraws();
});

export const requestLiveDraw = createServerFn({ method: "POST" })
  .validator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const { revealDraw } = await import("@/lib/protocol.server");
    return revealDraw(data);
  });
