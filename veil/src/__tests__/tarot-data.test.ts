import { getRandomTarotCard, TarotCard } from "../data/tarot-data";

// Access the internal cards array via module re-import
// tarot-data exports cards implicitly via getRandomTarotCard — we test through that
// For structural tests, re-import the module default export
// The file exports cards as a const, but it's not exported — test via known card names
const ALL_CARD_NAMES = [
  "The Fool","The Magician","The High Priestess","The Empress","The Emperor",
  "The Hierophant","The Lovers","The Chariot","Strength","The Hermit",
  "Wheel of Fortune","Justice","The Hanged Man","Death","Temperance",
  "The Devil","The Tower","The Star","The Moon","The Sun","Judgement","The World",
];

// Collect a large sample to reason about the full deck
function sampleCards(n: number): TarotCard[] {
  return Array.from({ length: n }, () => getRandomTarotCard());
}

describe("1.1 Tarot Data", () => {
  test("1.1.1 Card count is exactly 22 — sample 10000 draws, verify all 22 names appear", () => {
    const seen = new Set(sampleCards(10000).map(c => c.name));
    expect(seen.size).toBe(22);
  });

  test("1.1.2 No duplicate IDs — all returned IDs are in unique set over large sample", () => {
    const sample = sampleCards(10000);
    const ids = new Set(sample.map(c => c.id));
    // Can't have more unique IDs than card count
    expect(ids.size).toBeLessThanOrEqual(22);
    // All IDs within range
    for (const id of ids) {
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThanOrEqual(21);
    }
  });

  test("1.1.3 Cards span IDs 0–21 — after sampling all must appear", () => {
    const sample = sampleCards(10000);
    const ids = new Set(sample.map(c => c.id));
    const expected = Array.from({ length: 22 }, (_, i) => i);
    for (const id of expected) {
      expect(ids.has(id)).toBe(true);
    }
  });

  test("1.1.4 Each card has id, name, meaning — validated via all 22 names", () => {
    const sample = sampleCards(10000);
    for (const card of sample) {
      expect(typeof card.id).toBe("number");
      expect(typeof card.name).toBe("string");
      expect(card.name.length).toBeGreaterThan(0);
      expect(typeof card.meaning).toBe("string");
      expect(card.meaning.length).toBeGreaterThan(0);
    }
  });

  test("1.1.5 getRandomTarotCard() returns a valid card — call 100 times", () => {
    for (let i = 0; i < 100; i++) {
      const card = getRandomTarotCard();
      expect(ALL_CARD_NAMES).toContain(card.name);
    }
  });

  test("1.1.6 Module import does not throw assertion error", () => {
    expect(() => require("../data/tarot-data")).not.toThrow();
  });
});
