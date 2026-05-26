import { useCallback } from "react";
import { Slot } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useOrchestrator } from "../../src/lib/useOrchestrator";
import { OrchestratorContext } from "../../src/lib/OrchestratorContext";
import { useEffectiveUserId } from "../../src/lib/useEffectiveUserId";

export default function DreamLayout() {
  const { getToken } = useAuth();
  const effectiveUserId = useEffectiveUserId();

  // For guest users Clerk's getToken() returns null, which causes the API
  // route to return 401.  Fall back to the guest UUID so the route can
  // identify and rate-limit the session without a Clerk JWT.
  const effectiveGetToken = useCallback(async () => {
    const token = await getToken();
    return token ?? effectiveUserId;
  }, [getToken, effectiveUserId]);

  const orchestrator = useOrchestrator(effectiveUserId ?? "", effectiveGetToken);

  return (
    <OrchestratorContext.Provider value={orchestrator}>
      <Slot />
    </OrchestratorContext.Provider>
  );
}
