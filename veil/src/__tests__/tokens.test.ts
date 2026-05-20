import { colors, fontSizes, spacing } from "../theme/tokens";

describe("1.6 Theme Tokens", () => {
  test("1.6.1 All 13 color tokens exist", () => {
    const required = [
      "background", "surface", "surfaceElevated", "border",
      "textPrimary", "textSecondary", "textMuted",
      "accent", "accentSoft", "gold", "goldSoft", "error", "success",
    ];
    for (const key of required) {
      expect(colors).toHaveProperty(key);
    }
  });

  test("1.6.2 All color values are valid hex strings", () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const [key, value] of Object.entries(colors)) {
      expect(value).toMatch(hexRegex);
    }
  });

  test("1.6.3 Font size scale has 8 entries", () => {
    const required = ["xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"];
    for (const key of required) {
      expect(fontSizes).toHaveProperty(key);
    }
    expect(Object.keys(fontSizes).length).toBe(8);
  });

  test("1.6.4 Spacing array has 10 values", () => {
    expect(spacing.length).toBe(10);
  });
});
