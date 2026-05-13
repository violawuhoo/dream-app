import { useState, useEffect, useRef } from "react";
import * as SecureStore from "expo-secure-store";
import { createSession } from "./dream-model";

type Session = ReturnType<typeof createSession>;

const DRAFT_KEY = "veil_draft_session";
const DRAFT_MAX_AGE_HOURS = 24;

interface UseDraftRestoreOptions {
  session: Session;
  updateSession: (updates: Partial<Session>) => void;
  resetSession: () => void;
}

export function useDraftRestore({ session, updateSession, resetSession }: UseDraftRestoreOptions) {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftAge, setDraftAge] = useState(0);
  const [draftSession, setDraftSession] = useState<Session | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(DRAFT_KEY);
        if (!stored) return;
        const parsed: Session & { _savedAt: string } = JSON.parse(stored);
        const ageHours = (Date.now() - new Date(parsed._savedAt).getTime()) / (1000 * 60 * 60);
        if (ageHours < DRAFT_MAX_AGE_HOURS) {
          setHasDraft(true);
          setDraftAge(Math.floor(ageHours));
          setDraftSession(parsed);
        } else {
          await SecureStore.deleteItemAsync(DRAFT_KEY);
        }
      } catch {
        // ignore corrupt or missing data
      }
    })();
  }, []);

  useEffect(() => {
    if (session.rawEntries.length === 0) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const payload = JSON.stringify({ ...session, _savedAt: new Date().toISOString() });
        await SecureStore.setItemAsync(DRAFT_KEY, payload);
      } catch {
        // ignore write errors
      }
    }, 1000);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [session]);

  const restoreDraft = () => {
    if (!draftSession) return;
    updateSession(draftSession);
    setHasDraft(false);
    setDraftSession(null);
  };

  const discardDraft = async () => {
    await SecureStore.deleteItemAsync(DRAFT_KEY);
    setHasDraft(false);
    setDraftSession(null);
    resetSession();
  };

  return {
    hasDraft,
    draftAge,
    draftSession,
    restoreDraft,
    discardDraft,
  };
}
