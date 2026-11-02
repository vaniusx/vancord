/**
 * Cosmetic catalogue mirrored on the client.
 *
 * The shop rows carry a `preview` jsonb blob, but an avatar renders hundreds of
 * times per screen and cannot wait for the shop query. These constants hold the
 * same values, so a frame can be drawn from a sku alone.
 */

export interface FrameLook {
  outer: string;
  inner: string;
  style: "solid" | "glow" | "metal" | "animated";
}

export const FRAMES: Record<string, FrameLook> = {
  frame_steel: { outer: "#9CA3AF", inner: "#4B5563", style: "solid" },
  frame_ember: { outer: "#B45309", inner: "#7C2D12", style: "glow" },
  frame_frost: { outer: "#60A5FA", inner: "#1E3A8A", style: "glow" },
  frame_leaf: { outer: "#4D7C0F", inner: "#28400A", style: "solid" },
  frame_neon: { outer: "#22D3EE", inner: "#0891B2", style: "glow" },
  frame_crystal: { outer: "#E879F9", inner: "#7E22CE", style: "glow" },
  frame_gold: { outer: "#FCD34D", inner: "#B45309", style: "metal" },
  frame_aurora: { outer: "#34D399", inner: "#6366F1", style: "animated" },
};

/** Nameplate colours: the colour a display name is drawn in. */
export const NAMEPLATES: Record<string, string> = {
  plate_ocean: "#0369A1",
  plate_rose: "#DB2777",
  plate_gold: "#B45309",
};

export function frameLook(sku: string | null | undefined): FrameLook | null {
  if (!sku) return null;
  return FRAMES[sku] ?? null;
}

export function nameplateColor(sku: string | null | undefined): string | null {
  if (!sku) return null;
  return NAMEPLATES[sku] ?? null;
}

export function isAnimatedFrame(frame: FrameLook | null): boolean {
  return frame?.style === "animated";
}
