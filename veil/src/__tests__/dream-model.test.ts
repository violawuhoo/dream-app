import { DreamFlowState, createSession, createDreamRecord, DreamRecord } from "../lib/dream-model";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("1.2 Dream Model", () => {
  test("1.2.1 DreamFlowState has exactly 11 values", () => {
    expect(Object.keys(DreamFlowState).length).toBe(11);
  });

  test("1.2.2 createSession() default state is RAW", () => {
    const session = createSession();
    expect(session.state).toBe("RAW");
  });

  test("1.2.3 createSession() generates a unique sessionID each call", () => {
    const s1 = createSession();
    const s2 = createSession();
    expect(s1.sessionID).not.toBe(s2.sessionID);
  });

  test("1.2.4 createSession() initialises arrays as empty", () => {
    const session = createSession();
    expect(session.messages).toEqual([]);
    expect(session.rawEntries).toEqual([]);
    expect(session.askedQuestions).toEqual([]);
  });

  test("1.2.5 createSession() sets nextCheckTurn to 5", () => {
    const session = createSession();
    expect(session.nextCheckTurn).toBe(5);
  });

  test("1.2.6 createDreamRecord() maps summary → narrative", () => {
    const record = createDreamRecord({ summary: "foo" });
    expect(record.narrative).toBe("foo");
  });

  test("1.2.7 createDreamRecord() maps lifeConnectionInterpretation to snake_case", () => {
    const record = createDreamRecord({ lifeConnectionInterpretation: "deep meaning" });
    expect(record.life_connection_interpretation).toBe("deep meaning");
  });

  test("1.2.8 createDreamRecord() maps tarotCard → tarot_card", () => {
    const tarotCard = { id: 0, name: "The Fool" };
    const record = createDreamRecord({ tarotCard });
    expect(record.tarot_card).toEqual(tarotCard);
  });

  test("1.2.9 createDreamRecord() generates a UUID id when omitted", () => {
    const record = createDreamRecord({});
    expect(record.id).toMatch(UUID_REGEX);
  });

  test("1.2.10 DreamRecord type is exported and usable", () => {
    // TypeScript compilation check — if this file compiles, the type is exported
    const record: DreamRecord = createDreamRecord({ summary: "test" });
    expect(record).toBeDefined();
  });
});
