import { useState, useCallback } from "react";
import { DreamFlowState, DreamFlowStateType, createSession, createDreamRecord } from "./dream-model";
import { callLLM } from "./llm-client";
import { buildExpansionMessages, buildStructuredMessages, buildInterpretationMessages, buildTitleMessages } from "./llm-prompts";

const DONE_PATTERNS = [
  "nope", "nah", "no", "nothing else", "that's it for now", "nothing more", "i'm done", "im done", "finish", "done",
  "that's all", "thats all", "that's it", "thats it", "i think that's it", "i think thats it", "no more", "enough", "just that", "you can summarize", "summarize it", "summarise it",
];

const CONTINUE_PATTERNS = [
  "yeah", "yep", "sure", "more please", "continue", "go on", "there's more", "theres more", "yes", "wait", "still"
];

export function useOrchestrator() {
  const [session, setSession] = useState(createSession());
  const [isProcessing, setIsProcessing] = useState(false);

  const updateSession = (updates: any) => {
    setSession((prev: any) => ({ ...prev, ...updates }));
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;

    // Save to messages
    const newMessage = { role: "user", content: text };
    const updatedMessages = [...session.messages, newMessage];
    
    updateSession({ 
      messages: updatedMessages,
      rawEntries: [...session.rawEntries, text],
      userTurnCount: session.userTurnCount + 1
    });

    setIsProcessing(true);

    try {
      const lowerText = text.toLowerCase();
      const isDone = DONE_PATTERNS.some(p => lowerText.includes(p));
      const isContinue = CONTINUE_PATTERNS.some(p => lowerText.includes(p));

      if (session.state === DreamFlowState.AWAITING_CONTINUE_DECISION) {
        if (isDone) {
          await proceedToStructuring({...session, messages: updatedMessages});
        } else {
          updateSession({ state: DreamFlowState.EXPANDING, waitingForContinueDecision: false });
          await askFollowUp({...session, messages: updatedMessages, state: DreamFlowState.EXPANDING});
        }
      } else if (session.state === DreamFlowState.RAW || session.state === DreamFlowState.EXPANDING) {
        if (isDone) {
          await proceedToStructuring({...session, messages: updatedMessages});
        } else if ((session.userTurnCount + 1) >= session.nextCheckTurn) {
          const checkMsg = { role: "assistant", content: "Do you want to add anything else? (Or we can finish and summarize)" };
          updateSession({ 
            messages: [...updatedMessages, checkMsg],
            state: DreamFlowState.AWAITING_CONTINUE_DECISION,
            waitingForContinueDecision: true,
            nextCheckTurn: session.userTurnCount + 4 
          });
        } else {
          await askFollowUp({...session, messages: updatedMessages, state: DreamFlowState.EXPANDING});
        }
      }
    } catch (e) {
      console.error(e);
      const errorMsg = { role: "assistant", content: "Something went wrong. Let's try that again." };
      updateSession({ messages: [...updatedMessages, errorMsg] });
    } finally {
      setIsProcessing(false);
    }
  };

  const askFollowUp = async (currentSession: any) => {
    // Artificial delay for "thinking"
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const prompts = buildExpansionMessages({ session: currentSession, latestUserMessage: currentSession.messages[currentSession.messages.length - 1].content });
    const response = await callLLM(prompts, 0.7);
    const newMsg = { role: "assistant", content: response };
    updateSession({ 
      messages: [...currentSession.messages, newMsg],
      lastAssistantQuestion: response
    });
  };

  const proceedToStructuring = async (currentSession: any) => {
    // We don't change state to STRUCTURED immediately to keep it in chat
    const prompts = buildStructuredMessages({ session: currentSession });
    const summary = await callLLM(prompts, 0.5);
    
    // Add summary to chat as Veil
    const summaryMsg = { role: "assistant", content: `Here is how I see your dream: ${summary}\n\nWould you like me to interpret these symbols for you?` };
    updateSession({ 
      summary, 
      messages: [...currentSession.messages, summaryMsg],
      state: DreamFlowState.STRUCTURED 
    });
  };

  const generateInterpretation = async () => {
    setIsProcessing(true);
    try {
      updateSession({ state: DreamFlowState.INTERPRETING });
      const prompts = buildInterpretationMessages({ session });
      const interpretation = await callLLM(prompts, 0.7);
      updateSession({ interpretation, state: DreamFlowState.DONE });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const skipInterpretation = () => {
    updateSession({ state: DreamFlowState.DONE });
  };

  const saveRecord = async () => {
    setIsProcessing(true);
    try {
      const titlePrompts = buildTitleMessages({ session });
      const title = await callLLM(titlePrompts, 0.7);
      
      const record = createDreamRecord({
        raw_input: session.rawEntries.join("\\n"),
        narrative: session.summary,
        title: title,
        interpretation: session.interpretation,
        status: DreamFlowState.DONE
      });
      
      // Load from local storage
      const existing = JSON.parse(localStorage.getItem("dream_records") || "[]");
      localStorage.setItem("dream_records", JSON.stringify([record, ...existing]));
      
      return true; // Success
    } catch (e) {
      console.error(e);
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
    updateSession
  };
}
