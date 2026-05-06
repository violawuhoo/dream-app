import { createDreamRecord, createSession, DreamFlowState } from "./dream-model.js";
import { APP_COPY, INTERPRETATION_FRAMES } from "./prompts.js";
import {
  requestDreamFollowUp,
  requestDreamSummary,
  requestDreamInterpretation,
  requestDreamTitle,
} from "./llm-client.js";

const DONE_PATTERNS = [
  "that's all",
  "thats all",
  "that's it",
  "thats it",
  "i think that's it",
  "i think thats it",
  "no more",
  "enough",
  "just that",
  "you can summarize",
  "summarize it",
  "summarise it",
  "nope",
  "nah",
  "no",
  "nothing else",
  "that's it for now",
  "nothing more",
  "i'm done",
  "im done",
  "finish",
  "done",
];

const CONTINUE_PATTERNS = [
  "yes",
  "yes, there is more",
  "there is more",
  "more",
  "i want to continue",
  "keep going",
  "not yet",
  "a little more",
  "i want to add more",
  "yeah",
  "yep",
  "sure",
  "more please",
  "continue",
  "go on",
  "there's more",
  "theres more",
];

const CHECK_IN_LINES = [
  "There is a clearer outline now. Do you want to add anything else?",
  "We have stayed with it for a bit. Is there anything more still there?",
  "This already has a shape. Do you want to add more before I gather it?",
];

const KEYWORD_LEXICON = [
  "sea",
  "ocean",
  "mall",
  "room",
  "house",
  "street",
  "bridge",
  "forest",
  "school",
  "shadow",
  "mother",
  "friend",
  "water",
  "falling",
  "running",
  "dark",
  "cold",
  "light",
  "door",
  "stairs",
];

const EMOTION_WORDS = [
  "afraid",
  "anxious",
  "calm",
  "curious",
  "happy",
  "joy",
  "lonely",
  "panic",
  "peaceful",
  "relieved",
  "sad",
  "scared",
  "terrified",
  "tense",
  "uneasy",
];

function normalize(text) {
  return text.trim().replace(/\s+/g, " ");
}

function unique(items) {
  return [...new Set(items)];
}

function detectIntent(input, patterns) {
  const normalized = normalize(input).toLowerCase();
  return patterns.some((pattern) => normalized === pattern || normalized.includes(pattern));
}

function detectDoneIntent(input) {
  return detectIntent(input, DONE_PATTERNS);
}

function detectContinueIntent(input) {
  return detectIntent(input, CONTINUE_PATTERNS);
}

function checkInCopy(session) {
  return CHECK_IN_LINES[(session.userTurnCount + session.askedQuestions.length) % CHECK_IN_LINES.length];
}

function extractKeywordsFromSession(session) {
  const text = session.rawEntries.join(" ").toLowerCase();
  return KEYWORD_LEXICON.filter((word) => text.includes(word)).slice(0, 8);
}

function extractEmotionsFromSession(session) {
  const text = session.rawEntries.join(" ").toLowerCase();
  return unique(EMOTION_WORDS.filter((word) => text.includes(word))).slice(0, 6);
}

function pushAssistant(session, content) {
  session.messages.push({ role: "assistant", content });
}

function pushUser(session, content) {
  session.messages.push({ role: "user", content });
}

async function generateExpansionQuestion(session, latestUserMessage, options = {}) {
  const question = await requestDreamFollowUp({
    session,
    latestUserMessage,
    continuation: options.continuation ?? false,
  });
  session.state = DreamFlowState.EXPANDING;
  session.waitingForContinueDecision = false;
  session.lastAssistantQuestion = question;
  session.askedQuestions.push(question);
  pushAssistant(session, question);
  return session;
}

async function generateStructuredSummary(session) {
  const summary = normalize(
    await requestDreamSummary({
      session,
    }),
  );

  session.summary = summary;
  session.state = DreamFlowState.STRUCTURED;
  session.waitingForContinueDecision = false;
  session.lastAssistantQuestion = "";
  pushAssistant(session, summary);
  return session;
}

export function startDreamSession() {
  const session = createSession();
  pushAssistant(session, APP_COPY.opening);
  return session;
}

export async function submitDreamMessage(session, input) {
  const content = normalize(input);
  if (!content || session.state === DreamFlowState.STRUCTURED || session.state === DreamFlowState.DONE) {
    return session;
  }

  if (session.waitingForContinueDecision && detectDoneIntent(content)) {
    pushUser(session, content);
    return generateStructuredSummary(session);
  }

  if (session.waitingForContinueDecision && detectContinueIntent(content)) {
    pushUser(session, content);
    session.waitingForContinueDecision = false;
    session.nextCheckTurn += 2;
    return generateExpansionQuestion(
      session,
      session.rawEntries[session.rawEntries.length - 1] ?? content,
      { continuation: true },
    );
  }

  pushUser(session, content);

  if (detectDoneIntent(content)) {
    return generateStructuredSummary(session);
  }

  const wasAwaitingDecision = session.waitingForContinueDecision;
  session.waitingForContinueDecision = false;
  session.rawEntries.push(content);
  session.userTurnCount += 1;

  if (wasAwaitingDecision) {
    session.nextCheckTurn = session.userTurnCount + 1;
  }

  if (session.userTurnCount >= session.nextCheckTurn) {
    session.state = DreamFlowState.AWAITING_CONTINUE_DECISION;
    session.waitingForContinueDecision = true;
    const checkIn = checkInCopy(session);
    session.lastAssistantQuestion = checkIn;
    session.askedQuestions.push(checkIn);
    pushAssistant(session, checkIn);
    return session;
  }

  return generateExpansionQuestion(session, content);
}

export async function requestDirectSummary(session) {
  session.directSummaryRequested = true;
  if (!session.rawEntries.length) {
    pushAssistant(session, "Give me at least one fragment first, and I will condense it directly.");
    return session;
  }

  return generateStructuredSummary(session);
}

export function confirmSummary(session) {
  session.state = DreamFlowState.INTERPRETING;
  session.interpretationDecisionPending = true;
  pushAssistant(session, APP_COPY.askInterpretation);
  return session;
}

export function correctSummary(session, updatedSummary) {
  session.summary = normalize(updatedSummary);
  session.state = DreamFlowState.INTERPRETING;
  session.interpretationDecisionPending = true;
  pushAssistant(
    session,
    "The summary has shifted. Now decide whether you want interpretation, or leave it as a plain record.",
  );
  return session;
}

export async function chooseInterpretation(session, shouldInterpret) {
  session.interpretationDecisionPending = false;
  if (shouldInterpret) {
    session.interpretation = await requestDreamInterpretation({ session });
    pushAssistant(session, "Here is one grounded reading of the dream.");
  } else {
    session.interpretation = "";
    pushAssistant(session, "We can keep it without adding meaning to it.");
  }
  session.state = DreamFlowState.DONE;
  return session;
}

export function stopSession(session) {
  pushAssistant(session, APP_COPY.stop);
  session.state = DreamFlowState.DONE;
  return session;
}

export async function finalizeRecord(session) {
  if (!session.title && session.summary) {
    session.title = await requestDreamTitle({ session });
  }
  const record = createDreamRecord({
    raw_input: session.rawEntries.join("\n"),
    narrative: session.summary,
    title: session.title || session.summary.substring(0, 100) + (session.summary.length > 100 ? "..." : ""),
    keywords: extractKeywordsFromSession(session),
    emotions: extractEmotionsFromSession(session),
    interpretation: session.interpretation,
    status: session.interpretation ? "interpreted" : "recorded",
  });
  session.completedRecord = record;
  pushAssistant(session, APP_COPY.saved);
  return record;
}
