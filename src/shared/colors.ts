/**
 * The palette for color-coding people. Deliberately muted so names read as
 * softly tinted rather than neon on the dark UI.
 */
export const PERSON_COLORS = {
  blue: "#6f9bf0",
  indigo: "#8793e8",
  sky: "#6bb9e0",
  cyan: "#69ced9",
  teal: "#5fc6b8",
  mint: "#93d2b1",
  green: "#78c98a",
  olive: "#a8b780",
  lime: "#b2c95f",
  yellow: "#d9ca78",
  amber: "#e0b45f",
  orange: "#d99a62",
  peach: "#e6b39d",
  coral: "#e08573",
  red: "#db797c",
  rose: "#e07fa3",
  pink: "#cf94c7",
  violet: "#a98bf0",
  lavender: "#c0a8dc",
  slate: "#93a3bd",
} as const;

export type PersonColorKey = keyof typeof PERSON_COLORS;

/** Hue order — what the palette grid in the picker shows. */
export const PERSON_COLOR_KEYS = Object.keys(PERSON_COLORS) as PersonColorKey[];

/**
 * Auto-assignment order. Alternates hue families so the first few people on a
 * trip get clearly different colors instead of five shades of blue-green.
 */
export const PERSON_COLOR_ASSIGNMENT: PersonColorKey[] = [
  "blue",
  "amber",
  "teal",
  "rose",
  "green",
  "violet",
  "coral",
  "sky",
  "lime",
  "slate",
  "red",
  "cyan",
  "orange",
  "indigo",
  "mint",
  "pink",
  "yellow",
  "lavender",
  "olive",
  "peach",
];

export function isPersonColorKey(value: string): value is PersonColorKey {
  return value in PERSON_COLORS;
}

/** Stable per-person fallback so unset colors still differ and stay consistent. */
export function fallbackPersonColorKey(id: string): PersonColorKey {
  let hash = 5381;
  for (let index = 0; index < id.length; index += 1) {
    hash = ((hash << 5) + hash + id.charCodeAt(index)) >>> 0;
  }
  return PERSON_COLOR_KEYS[hash % PERSON_COLOR_KEYS.length];
}

export function personColorKey(person: { id: string; color?: string | null }): PersonColorKey {
  if (person.color && isPersonColorKey(person.color)) return person.color;
  return fallbackPersonColorKey(person.id);
}

export function personColor(person: { id: string; color?: string | null }): string {
  return PERSON_COLORS[personColorKey(person)];
}
