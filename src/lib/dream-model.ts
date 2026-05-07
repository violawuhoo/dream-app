export const DreamFlowState = {
  RAW: "RAW",
  EXPANDING: "EXPANDING",
  AWAITING_CONTINUE_DECISION: "AWAITING_CONTINUE_DECISION",
  STRUCTURED: "STRUCTURED",
  INTERPRETING: "INTERPRETING",
  AWAITING_LIFE_CONNECTION: "AWAITING_LIFE_CONNECTION",
  DONE: "DONE",
} as const;

export type DreamFlowStateType = typeof DreamFlowState[keyof typeof DreamFlowState];

export function createDreamRecord(fields: any) {
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
    state: DreamFlowState.RAW as DreamFlowStateType,
    rawEntries: [] as string[],
    messages: [] as any[],
    userTurnCount: 0,
    nextCheckTurn: 5,
    waitingForContinueDecision: false,
    askedQuestions: [] as string[],
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
