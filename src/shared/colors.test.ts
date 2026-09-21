import { describe, expect, it } from "vite-plus/test";
import {
  PERSON_COLORS,
  PERSON_COLOR_ASSIGNMENT,
  PERSON_COLOR_KEYS,
  fallbackPersonColorKey,
  isPersonColorKey,
  personColor,
  personColorKey,
} from "./colors";

describe("palette", () => {
  it("has unique hex values", () => {
    expect(new Set(Object.values(PERSON_COLORS)).size).toBe(PERSON_COLOR_KEYS.length);
  });

  it("assigns every color exactly once", () => {
    expect([...PERSON_COLOR_ASSIGNMENT].sort()).toEqual([...PERSON_COLOR_KEYS].sort());
  });

  it("starts auto-assignment with clearly different hues", () => {
    expect(PERSON_COLOR_ASSIGNMENT.slice(0, 4)).toEqual(["blue", "amber", "teal", "rose"]);
  });

  it("recognises only palette keys", () => {
    expect(isPersonColorKey("teal")).toBe(true);
    expect(isPersonColorKey("#ff0000")).toBe(false);
    expect(isPersonColorKey("magenta")).toBe(false);
  });
});

describe("personColorKey", () => {
  it("prefers a stored palette key", () => {
    expect(personColorKey({ id: "abc", color: "rose" })).toBe("rose");
  });

  it("falls back to a key in the palette when unset or unknown", () => {
    const unset = personColorKey({ id: "abc", color: null });
    expect(PERSON_COLOR_KEYS).toContain(unset);
    const unknown = personColorKey({ id: "abc", color: "#ff00ff" });
    expect(PERSON_COLOR_KEYS).toContain(unknown);
  });

  it("is deterministic for the same id", () => {
    expect(fallbackPersonColorKey("person-1")).toBe(fallbackPersonColorKey("person-1"));
  });
});

describe("personColor", () => {
  it("resolves to a hex string", () => {
    expect(personColor({ id: "x", color: "blue" })).toBe(PERSON_COLORS.blue);
  });
});
