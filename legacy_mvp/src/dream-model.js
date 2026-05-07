export const DreamFlowState = Object.freeze({
  RAW: "RAW",
  EXPANDING: "EXPANDING",
  AWAITING_CONTINUE_DECISION: "AWAITING_CONTINUE_DECISION",
  STRUCTURED: "STRUCTURED",
  INTERPRETING: "INTERPRETING",
  DONE: "DONE",
});

export function createDreamRecord(fields) {
  return {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    raw_input: fields.raw_input ?? "",
    narrative: fields.narrative ?? "",
    title: fields.title ?? "",
    keywords: fields.keywords ?? [],
    emotions: fields.emotions ?? [],
    interpretation: fields.interpretation ?? "",
    status: fields.status ?? DreamFlowState.DONE,
  };
}

export function createSession() {
  return {
    state: DreamFlowState.RAW,
    rawEntries: [],
    messages: [],
    userTurnCount: 0,
    nextCheckTurn: 3,
    waitingForContinueDecision: false,
    askedQuestions: [],
    lastAssistantQuestion: "",
    collected: {
      emotion: [],
      action: [],
      environment: [],
      entity: [],
    },
    summary: "",
    title: "",
    interpretation: "",
    directSummaryRequested: false,
    interpretationDecisionPending: false,
    completedRecord: null,
  };
}
