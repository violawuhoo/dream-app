import { useState } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { DreamFlowState, DreamFlowStateType, createSession, createDreamRecord } from "./dream-model";
import { callLLMFull } from "./llm-client";
import { buildExpansionMessages, buildStructuredMessages, buildInterpretationMessages, buildTitleMessages, buildLifeConnectionInterpretationMessages, buildTarotInterpretationMessages, buildIntentClassificationMessages } from "./llm-prompts";
import { getRandomTarotCard } from "../data/tarot-data";
import { supabase } from "./supabase";

const DONE_PATTERNS = [
  "nope", "nah", "no", "nothing else", "that's it for now", "nothing more", "i'm done", "im done", "finish", "done",
  "that's all", "thats all", "that's it", "thats it", "i think that's it", "i think thats it", "no more", "enough", "just that", "you can summarize", "summarize it", "summarise it",
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useOrchestrator() {
  const [session, setSession] = useState(createSession());
  const [isProcessing, setIsProcessing] = useState(false);
  const { getToken, userId } = useAuth();

  const updateSession = (updates: any) => {
    setSession((prev: any) => ({ ...prev, ...updates }));
  };

  const checkIntent = async (text: string) => {
    const prompts = buildIntentClassificationMessages({ text });
    const response = await callLLMFull(prompts, 0, getToken);
    return response.trim().toUpperCase() === "DONE";
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;

    const newMessage = { role: "user", content: text };
    const updatedMessages = [...session.messages, newMessage];

    updateSession({
      messages: updatedMessages,
      rawEntries: [...session.rawEntries, text],
      userTurnCount: session.userTurnCount + 1,
    });

    setIsProcessing(true);

    try {
      const lowerText = text.toLowerCase().trim();

      let isDone = false;
      if (session.userTurnCount + 1 >= 4) {
        const keywordDone = lowerText.length < 30 && DONE_PATTERNS.some(p => {
          const regex = new RegExp(`\\b${p}\\b`, "i");
          return regex.test(lowerText);
        });

        if (keywordDone || lowerText.includes("summarize") || lowerText.includes("finish")) {
          isDone = await checkIntent(text);
        }
      }

      if (session.state === DreamFlowState.AWAITING_CONTINUE_DECISION) {
        if (isDone) {
          await proceedToStructuring({ ...session, messages: updatedMessages });
        } else {
          updateSession({ state: DreamFlowState.EXPANDING, waitingForContinueDecision: false });
          await askFollowUp({ ...session, messages: updatedMessages, state: DreamFlowState.EXPANDING });
        }
      } else if (session.state === DreamFlowState.RAW || session.state === DreamFlowState.EXPANDING) {
        if (isDone) {
          await proceedToStructuring({ ...session, messages: updatedMessages });
        } else if ((session.userTurnCount + 1) >= session.nextCheckTurn) {
          await sleep(800);
          const checkMsg = { role: "assistant", content: "Do you want to add anything else? (Or we can finish and summarize)" };
          updateSession({
            messages: [...updatedMessages, checkMsg],
            state: DreamFlowState.AWAITING_CONTINUE_DECISION,
            waitingForContinueDecision: true,
            nextCheckTurn: session.userTurnCount + 4,
          });
        } else {
          await askFollowUp({ ...session, messages: updatedMessages, state: DreamFlowState.EXPANDING });
        }
      } else if (session.state === DreamFlowState.AWAITING_LIFE_CONNECTION) {
        await handleLifeConnection(text);
      }
    } catch (e) {
      console.error(e);
      await sleep(800);
      const errorMsg = { role: "assistant", content: "Something went wrong. Let's try that again." };
      updateSession({ messages: [...updatedMessages, errorMsg] });
    } finally {
      setIsProcessing(false);
    }
  };

  const askFollowUp = async (currentSession: any) => {
    await sleep(800);
    const prompts = buildExpansionMessages({ session: currentSession, latestUserMessage: currentSession.messages[currentSession.messages.length - 1].content });
    const response = await callLLMFull(prompts, 0.7, getToken);
    const newMsg = { role: "assistant", content: response };
    updateSession({
      messages: [...currentSession.messages, newMsg],
      lastAssistantQuestion: response,
    });
  };

  const proceedToStructuring = async (currentSession: any) => {
    await sleep(800);
    const prompts = buildStructuredMessages({ session: currentSession });
    const summary = await callLLMFull(prompts, 0.5, getToken);

    const summaryMsg = { role: "assistant", content: `Here is how I see your dream: ${summary}\n\nWould you like me to interpret these symbols for you?` };
    updateSession({
      summary,
      messages: [...currentSession.messages, summaryMsg],
      state: DreamFlowState.STRUCTURED,
    });
  };

  const generateInterpretation = async () => {
    setIsProcessing(true);
    try {
      updateSession({ state: DreamFlowState.INTERPRETING });
      await sleep(800);
      const prompts = buildInterpretationMessages({ session });
      const interpretation = await callLLMFull(prompts, 0.7, getToken);

      const interpretationMsg = { role: "assistant", content: interpretation };
      const questionMsg = { role: "assistant", content: "How does this land with you? Is there a specific event or feeling in your waking life that this brings to mind?" };

      updateSession({
        interpretation,
        messages: [...session.messages, interpretationMsg, questionMsg],
        state: DreamFlowState.AWAITING_LIFE_CONNECTION,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLifeConnection = async (userResponse: string) => {
    if (!userResponse.trim()) return;
    setIsProcessing(true);
    try {
      updateSession({
        state: DreamFlowState.LIFE_CONNECTION_INTERPRETING,
        lifeConnection: userResponse,
      });

      await sleep(800);
      const prompts = buildLifeConnectionInterpretationMessages({ session: { ...session, lifeConnection: userResponse }, lifeEvent: userResponse });
      const lifeConnectionInterpretation = await callLLMFull(prompts, 0.7, getToken);

      const interpretationMsg = { role: "assistant", content: lifeConnectionInterpretation };
      const questionMsg = { role: "assistant", content: "Would you like to draw a Tarot card for further confirmation or final insight?" };

      updateSession({
        lifeConnectionInterpretation,
        messages: [...session.messages, { role: "user", content: userResponse }, interpretationMsg, questionMsg],
        state: DreamFlowState.AWAITING_TAROT_DECISION,
      });
    } catch (e) {
      console.error(e);
      updateSession({ state: DreamFlowState.DONE });
    } finally {
      setIsProcessing(false);
    }
  };

  const drawTarot = async () => {
    setIsProcessing(true);
    try {
      updateSession({ state: DreamFlowState.TAROT_DRAWING });
      await sleep(2000);

      const tarotCard = getRandomTarotCard();
      const sessionWithCard = { ...session, tarotCard, state: DreamFlowState.TAROT_INTERPRETING };
      updateSession({ tarotCard, state: DreamFlowState.TAROT_INTERPRETING });

      await sleep(800);
      const prompts = buildTarotInterpretationMessages({ session: sessionWithCard });
      const tarotInterpretation = await callLLMFull(prompts, 0.7, getToken);

      const cardMsg = { role: "assistant", content: `You drew **${tarotCard.name}**. ${tarotCard.meaning}` };
      const interpretationMsg = { role: "assistant", content: tarotInterpretation };

      updateSession({
        tarotInterpretation,
        messages: [...session.messages, cardMsg, interpretationMsg],
        state: DreamFlowState.DONE,
      });
    } catch (e) {
      console.error(e);
      updateSession({ state: DreamFlowState.DONE });
    } finally {
      setIsProcessing(false);
    }
  };

  const skipTarot = () => {
    updateSession({ state: DreamFlowState.DONE });
  };

  const skipInterpretation = () => {
    updateSession({ state: DreamFlowState.DONE });
  };

  const saveRecord = async () => {
    setIsProcessing(true);
    try {
      let title = session.title;
      if (!title || title === "Untitled Dream") {
        const prompts = buildTitleMessages({ session });
        const generatedTitle = await callLLMFull(prompts, 0.7, getToken);
        title = generatedTitle.replace(/["']/g, "").trim();
      }

      const record = createDreamRecord({
        ...session,
        title,
        interpretation: session.interpretation,
        lifeConnectionInterpretation: session.lifeConnectionInterpretation,
        tarotInterpretation: session.tarotInterpretation,
        tarotCard: session.tarotCard,
      });

      const row = {
        id: record.id,
        session_id: record.sessionID,
        user_id: userId ?? "",
        created_at: record.created_at,
        raw_input: record.raw_input,
        narrative: record.narrative,
        title: record.title,
        keywords: record.keywords,
        emotions: record.emotions,
        interpretation: record.interpretation,
        life_connection_interpretation: record.life_connection_interpretation,
        tarot_card: record.tarot_card as Record<string, unknown> | null,
        tarot_interpretation: record.tarot_interpretation,
        status: record.status,
      };

      const { error } = await supabase.from("dream_records").upsert(row, { onConflict: "id" });
      if (error) throw error;

      updateSession({ title, completedRecord: record });
      return true;
    } catch (e) {
      console.error("Save failed", e);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSession = () => {
    setSession(createSession());
  };

  return {
    session,
    isProcessing,
    handleUserMessage,
    proceedToStructuring,
    generateInterpretation,
    skipInterpretation,
    saveRecord,
    resetSession,
    handleLifeConnection,
    drawTarot,
    skipTarot,
    updateSession,
  };
}
