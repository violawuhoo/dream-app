import { useState, useCallback } from "react";
import { DreamFlowState, DreamFlowStateType, createSession, createDreamRecord } from "./dream-model";
import { callLLM } from "./llm-client";
import { buildExpansionMessages, buildStructuredMessages, buildInterpretationMessages, buildTitleMessages, buildLifeConnectionMessages, buildLifeConnectionInterpretationMessages, buildTarotInterpretationMessages, buildIntentClassificationMessages } from "./llm-prompts";
import { getRandomTarotCard } from "./tarot-data";

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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const checkIntent = async (text: string) => {
    const prompts = buildIntentClassificationMessages({ text });
    const response = await callLLM(prompts, 0);
    return response.trim().toUpperCase() === "DONE";
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
      const lowerText = text.toLowerCase().trim();
      
      // Enforce 4-turn minimum. Only check for "done" if turns >= 4.
      let isDone = false;
      if (session.userTurnCount + 1 >= 4) {
        // Keyword check first (fast)
        const keywordDone = lowerText.length < 30 && DONE_PATTERNS.some(p => {
          const regex = new RegExp(`\\b${p}\\b`, 'i');
          return regex.test(lowerText);
        });

        // If keywords match OR it's a suspicious "summarize" request, use LLM intent classification
        if (keywordDone || lowerText.includes("summarize") || lowerText.includes("finish")) {
          isDone = await checkIntent(text);
        }
      }

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
          await sleep(800); // Uniform pause
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
    await sleep(800); // Uniform pause
    
    const prompts = buildExpansionMessages({ session: currentSession, latestUserMessage: currentSession.messages[currentSession.messages.length - 1].content });
    const response = await callLLM(prompts, 0.7);
    const newMsg = { role: "assistant", content: response };
    updateSession({ 
      messages: [...currentSession.messages, newMsg],
      lastAssistantQuestion: response
    });
  };

  const proceedToStructuring = async (currentSession: any) => {
    await sleep(800); // Uniform pause
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
      await sleep(800); // Uniform pause
      const prompts = buildInterpretationMessages({ session });
      const interpretation = await callLLM(prompts, 0.7);
      
      const interpretationMsg = { role: "assistant", content: interpretation };
      const questionMsg = { role: "assistant", content: "How does this land with you? Is there a specific event or feeling in your waking life that this brings to mind?" };
      
      updateSession({ 
        interpretation, 
        messages: [...session.messages, interpretationMsg, questionMsg],
        state: DreamFlowState.AWAITING_LIFE_CONNECTION 
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
        lifeConnection: userResponse 
      });
      
      await sleep(800); // Uniform pause
      const prompts = buildLifeConnectionInterpretationMessages({ session: { ...session, lifeConnection: userResponse }, lifeEvent: userResponse });
      const lifeConnectionInterpretation = await callLLM(prompts, 0.7);
      
      const interpretationMsg = { role: "assistant", content: lifeConnectionInterpretation };
      const questionMsg = { role: "assistant", content: "Would you like to draw a Tarot card for further confirmation or final insight?" };
      
      updateSession({ 
        lifeConnectionInterpretation, 
        messages: [...session.messages, { role: "user", content: userResponse }, interpretationMsg, questionMsg],
        state: DreamFlowState.AWAITING_TAROT_DECISION 
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
      await sleep(2000); // Animation delay
      
      const tarotCard = getRandomTarotCard();
      const sessionWithCard = { ...session, tarotCard, state: DreamFlowState.TAROT_INTERPRETING };
      updateSession({ tarotCard, state: DreamFlowState.TAROT_INTERPRETING });
      
      await sleep(800); // Uniform pause
      const prompts = buildTarotInterpretationMessages({ session: sessionWithCard });
      const tarotInterpretation = await callLLM(prompts, 0.7);
      
      const cardMsg = { role: "assistant", content: `You drew **${tarotCard.name}**. ${tarotCard.meaning}` };
      const interpretationMsg = { role: "assistant", content: tarotInterpretation };
      
      updateSession({ 
        tarotInterpretation, 
        messages: [...session.messages, cardMsg, interpretationMsg],
        state: DreamFlowState.DONE 
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
      // Generate title if not exists
      let title = session.title;
      if (!title || title === "Untitled Dream") {
        const prompts = buildTitleMessages({ session });
        const generatedTitle = await callLLM(prompts, 0.7);
        title = generatedTitle.replace(/["']/g, "").trim();
      }

      const record = createDreamRecord({
        ...session,
        title,
        interpretation: session.interpretation,
        lifeConnectionInterpretation: session.lifeConnectionInterpretation,
        tarotInterpretation: session.tarotInterpretation,
        tarotCard: session.tarotCard
      });

      const existingRecords = JSON.parse(localStorage.getItem("dream_records") || "[]");
      // Check if this session already exists (by sessionID)
      const index = existingRecords.findIndex((r: any) => r.sessionID === session.sessionID);
      
      if (index !== -1) {
        existingRecords[index] = { ...existingRecords[index], ...record };
      } else {
        existingRecords.unshift(record);
      }
      
      localStorage.setItem("dream_records", JSON.stringify(existingRecords));
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
    updateSession
  };
}
