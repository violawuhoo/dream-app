import {
  buildExpansionMessages,
  buildStructuredMessages,
  buildInterpretationMessages,
  buildLifeConnectionInterpretationMessages,
  buildIntentClassificationMessages,
} from "../lib/llm-prompts";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    rawEntries: [] as string[],
    messages: [] as any[],
    userTurnCount: 1,
    summary: "A test dream summary",
    interpretation: "You feel free and unbound",
    lifeConnection: "I started a new job",
    tarotCard: { name: "The Fool", meaning: "New beginnings and spontaneity." },
    ...overrides,
  };
}

describe("2.1 Prompt Builders", () => {
  test("2.1.1 buildExpansionMessages returns exactly 2 messages with roles system and user", () => {
    const session = makeSession();
    const result = buildExpansionMessages({ session, latestUserMessage: "I was flying" });
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[1].role).toBe("user");
    expect(result[0].content).toBeTruthy();
    expect(result[1].content).toBeTruthy();
  });

  test("2.1.2 buildStructuredMessages returns valid role/content shape", () => {
    const session = makeSession({ rawEntries: ["I was flying over mountains"] });
    const result = buildStructuredMessages({ session });
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[1].role).toBe("user");
    expect(result[0].content).toBeTruthy();
    expect(result[1].content).toBeTruthy();
  });

  test("2.1.3 buildInterpretationMessages returns valid role/content shape", () => {
    const session = makeSession({ summary: "I was flying over an ocean" });
    const result = buildInterpretationMessages({ session });
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[1].role).toBe("user");
    expect(result[0].content).toBeTruthy();
    expect(result[1].content).toBeTruthy();
  });

  test("2.1.4 buildLifeConnectionInterpretationMessages returns valid role/content shape", () => {
    const session = makeSession();
    const result = buildLifeConnectionInterpretationMessages({
      session,
      lifeEvent: "I just started a new job and feel overwhelmed",
    });
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[1].role).toBe("user");
    expect(result[0].content).toBeTruthy();
    expect(result[1].content).toBeTruthy();
  });

  test("2.1.5 buildIntentClassificationMessages returns valid role/content shape", () => {
    const result = buildIntentClassificationMessages({ text: "I think that's all" });
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[1].role).toBe("user");
    expect(result[0].content).toBeTruthy();
    expect(result[1].content).toBeTruthy();
  });

  test("2.1.6 No builder produces content longer than 2000 chars for typical input", () => {
    const realisticEntry = "I was standing in a vast empty field watching the sky turn purple and gold";
    const session = makeSession({
      rawEntries: Array(10).fill(realisticEntry),
      messages: [],
      userTurnCount: 10,
    });
    const allMessages = [
      ...buildExpansionMessages({ session, latestUserMessage: "I felt very calm" }),
      ...buildStructuredMessages({ session }),
      ...buildInterpretationMessages({ session }),
      ...buildLifeConnectionInterpretationMessages({ session, lifeEvent: "I changed careers recently" }),
      ...buildIntentClassificationMessages({ text: "I think that is all for now" }),
    ];
    for (const msg of allMessages) {
      expect(msg.content.length).toBeLessThanOrEqual(2000);
    }
  });

  test("2.1.7 buildExpansionMessages includes the latest user message in user content", () => {
    const session = makeSession();
    const result = buildExpansionMessages({ session, latestUserMessage: "I was at a beach" });
    expect(result[1].content).toContain("I was at a beach");
  });
});
