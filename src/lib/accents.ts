/** Server accents. Every value is chosen to pass WCAG AA against white text. */
const ACCENTS = [
  "#4F46E5",
  "#7C3AED",
  "#DB2777",
  "#0369A1",
  "#047857",
  "#B45309",
  "#DC2626",
  "#4D7C0F",
] as const;

export function accentFor(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 100_003;
  }
  return ACCENTS[hash % ACCENTS.length];
}

export const ACCENT_OPTIONS = ACCENTS;
