import { describe, expect, it } from "vitest";
import {
  THEMES,
  resolveTheme,
  CODE_CORPUS,
  CHARS_PER_KEY,
  nextCursor,
  visibleText,
  OVERLAY_TEXT,
} from "../public/typer.js";

describe("resolveTheme", () => {
  it("accepts known theme ids", () => {
    expect(resolveTheme("matrix")).toBe("matrix");
    expect(resolveTheme("cyber")).toBe("cyber");
    expect(resolveTheme("amber")).toBe("amber");
  });

  it("falls back to matrix for unknown/missing values", () => {
    expect(resolveTheme("neo")).toBe("matrix");
    expect(resolveTheme(null)).toBe("matrix");
    expect(resolveTheme(undefined)).toBe("matrix");
    expect(resolveTheme("")).toBe("matrix");
  });

  it("every theme defines the full palette", () => {
    for (const [id, theme] of Object.entries(THEMES)) {
      expect(theme.fg, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.dim, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.bg, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.accent, id).toMatch(/^#[0-9a-f]{6}$/);
      expect(theme.name.length, id).toBeGreaterThan(0);
    }
  });
});

describe("code streaming", () => {
  it("corpus has multiple realistic snippets, all non-trivial", () => {
    expect(CODE_CORPUS.length).toBeGreaterThanOrEqual(6);
    for (const snippet of CODE_CORPUS) {
      expect(snippet.length).toBeGreaterThan(120);
    }
  });

  it("emits CHARS_PER_KEY characters per keystroke", () => {
    expect(nextCursor(0, CODE_CORPUS[0])).toBe(CHARS_PER_KEY);
    expect(visibleText(CHARS_PER_KEY, CODE_CORPUS[0])).toBe(CODE_CORPUS[0].slice(0, CHARS_PER_KEY));
  });

  it("wraps to a new snippet when the current one is exhausted", () => {
    const first = CODE_CORPUS[0];
    const atEnd = nextCursor(first.length - CHARS_PER_KEY, first);
    expect(atEnd).toBe(0);
  });

  it("visibleText never exceeds the corpus length", () => {
    const first = CODE_CORPUS[0];
    expect(visibleText(first.length + 500, first)).toBe(first);
  });
});

describe("overlay text", () => {
  it("defines both overlays with non-empty copy", () => {
    expect(OVERLAY_TEXT.granted.title).toBe("ACCESS GRANTED");
    expect(OVERLAY_TEXT.denied.title).toBe("ACCESS DENIED");
    for (const overlay of Object.values(OVERLAY_TEXT)) {
      expect(overlay.sub.length).toBeGreaterThan(0);
    }
  });
});
