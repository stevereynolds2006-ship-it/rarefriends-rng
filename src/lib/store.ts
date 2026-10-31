import { create } from "zustand";
import { fulfill, openBeacon, type BeaconInfo, type DrawParams, type Proof } from "@/lib/beacon";

const MAX_DRAWS = 48;

type BeaconStore = {
  ready: boolean;
  booting: boolean;
  info: BeaconInfo | null;
  error: string | null;
  busy: boolean;
  draws: Proof[];
  selectedId: string | null;
  boot: () => Promise<void>;
  requestDraw: (params: DrawParams) => Promise<void>;
  select: (id: string | null) => void;
};

export const useBeacon = create<BeaconStore>((set, get) => ({
  ready: false,
  booting: false,
  info: null,
  error: null,
  busy: false,
  draws: [],
  selectedId: null,
  boot: async () => {
    if (get().ready || get().booting) return;
    set({ booting: true, error: null });
    try {
      const info = await openBeacon();
      set({ info, ready: true, booting: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Beacon failed to start";
      set({ error: message, booting: false, ready: false });
    }
  },
  requestDraw: async (params) => {
    if (get().busy) return;
    set({ busy: true, error: null });
    try {
      const proof = await fulfill(params);
      set((state) => ({
        busy: false,
        draws: [proof, ...state.draws].slice(0, MAX_DRAWS),
        selectedId: proof.id,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draw failed";
      set({ busy: false, error: message });
    }
  },
  select: (id) => set({ selectedId: id }),
}));

export function latencyQuantile(draws: Proof[], q: number): number | null {
  if (draws.length === 0) return null;
  const sorted = draws.map((draw) => draw.latencyMs).sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[index] ?? null;
}
