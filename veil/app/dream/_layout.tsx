import { useCallback, useEffect, useRef } from "react";
import { Slot, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOrchestrator } from "../../src/lib/useOrchestrator";
import { OrchestratorContext } from "../../src/lib/OrchestratorContext";
import { useEffectiveUserId } from "../../src/lib/useEffectiveUserId";
import { useDraftRestore } from "../../src/lib/useDraftRestore";

export default function DreamLayout() {
  const { getToken } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { restore } = useLocalSearchParams<{ restore?: string }>();

  // For guest users Clerk's getToken() returns null, which causes the API
  // route to return 401.  Fall back to the guest UUID so the route can
  // identify and rate-limit the session without a Clerk JWT.
  const effectiveGetToken = useCallback(async () => {
    const token = await getToken();
    if (token) return token;
    // effectiveUserId may still be null if AsyncStorage hasn't resolved yet —
    // read directly to avoid sending null as the auth token.
    if (effectiveUserId) return effectiveUserId;
    return await AsyncStorage.getItem("veil_guest_id");
  }, [getToken, effectiveUserId]);

  const orchestrator = useOrchestrator(effectiveUserId ?? "", effectiveGetToken);

  // Persist the capture session as a draft so it survives force-quit.
  // Only auto-restore when explicitly navigated from the "Continue" button
  // (restore=true param), so fresh sessions don't pick up stale drafts.
  const autoRestored = useRef(false);
  const { hasDraft, restoreDraft } = useDraftRestore({
    session: orchestrator.session,
    updateSession: orchestrator.updateSession,
    resetSession: orchestrator.resetSession,
  });

  useEffect(() => {
    if (restore === "true" && hasDraft && !autoRestored.current) {
      autoRestored.current = true;
      restoreDraft();
    }
  }, [restore, hasDraft]);

  return (
    <OrchestratorContext.Provider value={orchestrator}>
      <Slot />
    </OrchestratorContext.Provider>
  );
}
