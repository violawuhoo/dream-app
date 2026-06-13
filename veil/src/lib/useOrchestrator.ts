import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DreamFlowState, DreamFlowStateType, createSession, createDreamRecord, DreamRecord } from "./dream-model";
import { callLLM, callLLMFull } from "./llm-client";
import { buildExpansionMessages, buildStructuredMessages, buildInterpretationMessages, buildLifeConnectionInterpretationMessages, buildTarotInterpretationMessages, buildIntentClassificationMessages } from "./llm-prompts";
import { getRandomTarotCard } from "../data/tarot-data";
import { supabase } from "./supabase";
import { saveLocalDream } from "./localDreams";

const DONE_PATTERNS = [
  "nope", "nah", "no", "nothing else", "that's it for now", "nothing more", "i'm done", "im done", "finish", "done",
  "that's all", "thats all", "that's it", "thats it", "i think that's it", "i think thats it", "no more", "enough", "just that", "you can summarize", "summarize it", "summarise it",
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useOrchestrator(
  userId: string,
  getToken: () => Promise<string | null>,
  initialSession?: ReturnType<typeof createSession>
) {
  const [session, setSession] = useState(initialSession ?? createSession());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSession = (updates: any) => {
    setSession((prev: any) => ({ ...prev, ...updates }));
  };

  const checkIntent = async (text: string): Promise<boolean> => {
    try {
      const prompts = buildIntentClassificationMessages({ text });
      const response = await callLLMFull(prompts, 0, getToken);
      return response.trim().toUpperCase() === "DONE";
    } catch (e) {
      // LLM unavailable — default to "not done" so capture continues normally.
      console.error("checkIntent LLM failed, defaulting to CONTINUE", e);
      return false;
    }
  };

  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    if (isProcessing) return;

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
      // Only run the done-detection logic when in capture states where it matters.
      // AWAITING_LIFE_CONNECTION messages are never "done" signals — skip to avoid
      // a spurious checkIntent LLM call (e.g. "I just finished a project" fires it).
      if (
        session.userTurnCount + 1 >= 4 &&
        session.state !== DreamFlowState.AWAITING_LIFE_CONNECTION
      ) {
        const keywordDone = lowerText.length < 30 && DONE_PATTERNS.some(p => {
          const regex = new RegExp(`\\b${p}\\b`, "i");
          return regex.test(lowerText);
        });

        if (keywordDone || lowerText.includes("summarize") || lowerText.includes("finish")) {
          // Short messages that already matched a done keyword don't need LLM
          // confirmation — the keyword check is authoritative for brevity.
          if (keywordDone) {
            isDone = true;
          } else {
            isDone = await checkIntent(text);
          }
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
          updateSession({ state: DreamFlowState.EXPANDING });
          await askFollowUp({ ...session, messages: updatedMessages, state: DreamFlowState.EXPANDING });
        }
      } else if (session.state === DreamFlowState.AWAITING_LIFE_CONNECTION) {
        await handleLifeConnection(text);
      }
    } catch (e) {
      console.error(e);
      setError("The connection wavered. Please try again.");
      await sleep(800);
      const errorMsg = { role: "assistant", content: "Something went wrong. Let's try that again." };
      updateSession({ messages: [...updatedMessages, errorMsg] });
    } finally {
      setIsProcessing(false);
    }
  };

  const FOLLOW_UP_FALLBACKS = [
    "What else comes to mind from your dream?",
    "Were there any other details that felt significant?",
    "How did the dream make you feel overall?",
    "Is there anything else you'd like to add?",
  ];

  const askFollowUp = async (currentSession: any) => {
    await sleep(800);
    const prompts = buildExpansionMessages({ session: currentSession, latestUserMessage: currentSession.messages[currentSession.messages.length - 1].content });
    let response = "";
    const baseMessages = [...currentSession.messages];
    try {
      for await (const chunk of callLLM(prompts, 0.7, getToken)) {
        response += chunk;
        updateSession({ messages: [...baseMessages, { role: "assistant", content: response }] });
      }
      updateSession({ lastAssistantQuestion: response });
    } catch (e) {
      // LLM unavailable (no server in release build, network error, etc.) —
      // use a generic follow-up so the capture flow can continue uninterrupted.
      console.error("askFollowUp LLM failed, using fallback prompt", e);
      const idx = Math.min(currentSession.userTurnCount - 1, FOLLOW_UP_FALLBACKS.length - 1);
      const fallback = FOLLOW_UP_FALLBACKS[Math.max(0, idx)];
      updateSession({
        messages: [...baseMessages, { role: "assistant", content: fallback }],
        lastAssistantQuestion: fallback,
      });
    }
  };

  const proceedToStructuring = async (currentSession: any) => {
    await sleep(800);
    let summary = "";
    try {
      const prompts = buildStructuredMessages({ session: currentSession });
      const baseMessages = [...currentSession.messages];
      for await (const chunk of callLLM(prompts, 0.5, getToken)) {
        summary += chunk;
        updateSession({ messages: [...baseMessages, { role: "assistant", content: `Here is how I see your dream: ${summary}\n\nWould you like me to interpret these symbols for you?` }] });
      }
    } catch (e) {
      console.error("proceedToStructuring LLM failed, falling back to raw entries", e);
      summary = (currentSession.rawEntries as string[] ?? []).join(". ");
    }
    updateSession({ summary, state: DreamFlowState.STRUCTURED });
  };

  const generateInterpretation = async () => {
    setIsProcessing(true);
    try {
      updateSession({ state: DreamFlowState.INTERPRETING });
      await sleep(800);
      const prompts = buildInterpretationMessages({ session });
      let interpretation = "";
      const baseMessages = [...session.messages];
      for await (const chunk of callLLM(prompts, 0.7, getToken)) {
        interpretation += chunk;
        updateSession({ messages: [...baseMessages, { role: "assistant", content: interpretation }] });
      }
      const questionMsg = { role: "assistant", content: "How does this land with you? Is there a specific event or feeling in your waking life that this brings to mind?" };
      updateSession({
        interpretation,
        messages: [...baseMessages, { role: "assistant", content: interpretation }, questionMsg],
        state: DreamFlowState.AWAITING_LIFE_CONNECTION,
      });
    } catch (e) {
      console.error("generateInterpretation LLM failed, falling back", e);
      // Use the dream summary as a fallback interpretation so the detail screen
      // always renders section-interpretation for a full-path dream.
      const fallbackInterpretation = session.summary || "Your dream has been recorded.";
      const questionMsg = { role: "assistant", content: "How does this land with you? Is there a specific event or feeling in your waking life that this brings to mind?" };
      updateSession({
        interpretation: fallbackInterpretation,
        messages: [...session.messages, questionMsg],
        state: DreamFlowState.AWAITING_LIFE_CONNECTION,
      });
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
      let lifeConnectionInterpretation = "";
      const baseMessages = [...session.messages, { role: "user", content: userResponse }];
      for await (const chunk of callLLM(prompts, 0.7, getToken)) {
        lifeConnectionInterpretation += chunk;
        updateSession({ messages: [...baseMessages, { role: "assistant", content: lifeConnectionInterpretation }] });
      }
      const questionMsg = { role: "assistant", content: "Would you like to draw a Tarot card for further confirmation or final insight?" };
      updateSession({
        lifeConnectionInterpretation,
        messages: [...baseMessages, { role: "assistant", content: lifeConnectionInterpretation }, questionMsg],
        state: DreamFlowState.AWAITING_TAROT_DECISION,
      });
    } catch (e) {
      console.error("handleLifeConnection LLM failed, falling back", e);
      // Use the user's own response as a fallback so section-life-connection
      // renders on the detail screen even when the LLM is unavailable.
      const questionMsg = { role: "assistant", content: "Would you like to draw a Tarot card for further confirmation or final insight?" };
      const baseMessages = [...session.messages, { role: "user", content: userResponse }];
      updateSession({
        lifeConnectionInterpretation: userResponse,
        messages: [...baseMessages, questionMsg],
        state: DreamFlowState.AWAITING_TAROT_DECISION,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const drawTarot = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let drawnCard: any;
    setIsProcessing(true);
    try {
      drawnCard = getRandomTarotCard();
      const cardMsg = { role: "assistant", content: `You drew **${drawnCard.name}**.` };
      const baseMessages = [...session.messages, cardMsg];
      // Set the card immediately so the overlay can show the name while the
      // LLM generates a personalised interpretation in the background.
      updateSession({
        tarotCard: drawnCard,
        messages: baseMessages,
        state: DreamFlowState.TAROT_INTERPRETING,
      });

      const sessionWithCard = { ...session, tarotCard: drawnCard };
      const prompts = buildTarotInterpretationMessages({ session: sessionWithCard });
      let tarotInterpretation = "";
      for await (const chunk of callLLM(prompts, 0.7, getToken)) {
        tarotInterpretation += chunk;
        updateSession({
          tarotInterpretation,
          messages: [...baseMessages, { role: "assistant", content: tarotInterpretation }],
        });
      }
      updateSession({ state: DreamFlowState.DONE });
    } catch (e) {
      console.error("drawTarot LLM failed, falling back to card meaning", e);
      setError("The connection wavered. Please try again.");
      updateSession({
        ...(drawnCard ? { tarotCard: drawnCard, tarotInterpretation: drawnCard.meaning } : {}),
        state: DreamFlowState.DONE,
      });
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
        const firstEntry = (session.rawEntries as string[] ?? [])[0] ?? "Dream";
        title = firstEntry.length > 40 ? firstEntry.slice(0, 40) + "…" : firstEntry;
      }

      const record = createDreamRecord({
        ...session,
        title,
        interpretation: session.interpretation,
        lifeConnectionInterpretation: session.lifeConnectionInterpretation,
        tarotInterpretation: session.tarotInterpretation,
        tarotCard: session.tarotCard,
      });

      // Resolve the most accurate userId available at save time.
      // If the orchestrator was initialized before effectiveUserId resolved
      // (userId=""), fall back to reading the guest UUID from AsyncStorage.
      const resolvedUserId =
        userId || (await AsyncStorage.getItem("veil_guest_id")) || "";

      // Persist locally first so the archive can show the dream even if
      // Supabase is unavailable (e.g. RLS blocks anonymous writes in tests).
      await saveLocalDream({ ...record, user_id: resolvedUserId });

      try {
        // Abort the upsert when the 4 s timeout fires so no lingering HTTP
        // callbacks remain on the main queue (they would block EarlGrey).
        // IMPORTANT: clearTimeout must be called after the race so the abort
        // callback is never triggered if the upsert wins — a spurious
        // ac.abort() on an already-completed fetch queues a native main-queue
        // callback visible to EarlGrey's idle tracker.
        const ac = new AbortController();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const timeoutPromise = new Promise<{ error: Error }>((resolve) => {
          timeoutId = setTimeout(() => {
            ac.abort();
            resolve({ error: new Error("supabase timeout") });
          }, 4000);
        });
        const upsertPromise = supabase
          .from("dream_records")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .upsert({ ...record, session_id: record.sessionID, user_id: resolvedUserId } as any, { onConflict: "session_id" })
          .abortSignal(ac.signal);
        const { error } = await Promise.race([upsertPromise, timeoutPromise]) as { error: Error | null };
        clearTimeout(timeoutId); // cancel the timer if upsert won — prevents spurious ac.abort()
        if (error) throw error;
        await AsyncStorage.removeItem("veil_draft_session");
      } catch (e) {
        console.error("Supabase save failed, navigating anyway", e);
      }

      updateSession({ title, completedRecord: record });
      return true;
    } catch (e) {
      console.error("Save failed", e);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const loadRecords = async (): Promise<DreamRecord[]> => {
    const { data, error } = await supabase
      .from("dream_records")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DreamRecord[];
  };

  const resetSession = () => {
    setSession(createSession());
  };

  const clearError = () => setError(null);

  return {
    session,
    isProcessing,
    error,
    clearError,
    handleUserMessage,
    proceedToStructuring,
    generateInterpretation,
    skipInterpretation,
    saveRecord,
    loadRecords,
    resetSession,
    handleLifeConnection,
    drawTarot,
    skipTarot,
    updateSession,
  };
}
